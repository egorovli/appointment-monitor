/**
 * Hook for reservation booking loop
 * Attempts to book slots when they become available
 */

import type { EKonsulatClient, CreateReservationResult } from '../../lib/e-konsulat.gov.pl/index.ts'

import { useCallback, useEffect, useRef } from 'react'

import { createErrorLog, isHardRateLimit, SlotUnavailableError } from '../lib/error-classifier.ts'
import { useAppState } from './use-app-state.tsx'

export interface UseReservationOptions {
	client: EKonsulatClient
	enabled: boolean
	onSuccess?: (result: CreateReservationResult) => void
}

export interface UseReservationResult {
	isBooking: boolean
	attempts: number
	currentSlotIndex: number
	result: CreateReservationResult | undefined
	stop: () => void
}

// Delay between reservation attempts (ms)
const RETRY_DELAY = 200
const SLOT_SWITCH_DELAY = 100

export function useReservation(options: UseReservationOptions): UseReservationResult {
	const { client, enabled, onSuccess } = options
	const { state, dispatch } = useAppState()
	const stateRef = useRef(state)
	const isRunningRef = useRef(false)
	const abortRef = useRef<AbortController | null>(null)

	// Keep a ref of the latest state to avoid stale closures in long-running loops
	useEffect(() => {
		stateRef.current = state
	}, [state])

	const stop = useCallback(() => {
		isRunningRef.current = false
		if (abortRef.current) {
			abortRef.current.abort()
			abortRef.current = null
		}
	}, [])

	const attemptReservation = useCallback(async () => {
		const currentState = stateRef.current

		// CRITICAL: Check phase first - if already succeeded, don't attempt
		if (currentState.phase === 'success') {
			stop()
			return false
		}

		const { search, reservation, params } = currentState

		// Check prerequisites
		if (!search.checkSlotsResult?.token || !params) {
			return false
		}

		const slots = search.slots.filter(s => s.date)
		if (slots.length === 0) {
			return false
		}

		// Get current slot to try
		const slotIndex = reservation.currentSlotIndex
		if (slotIndex >= slots.length) {
			// Exhausted all slots, wait for new slots
			return false
		}

		const slot = slots[slotIndex]
		if (!slot?.date) {
			dispatch({ type: 'TRY_NEXT_SLOT' })
			return false
		}

		abortRef.current = new AbortController()

		try {
			dispatch({ type: 'INCREMENT_RESERVATION_ATTEMPT' })

			const result = await client.createReservation({
				date: slot.date,
				locationId: params.locationId,
				token: search.checkSlotsResult.token,
				amount: params.amount,
				signal: abortRef.current.signal
			})

			// Success! (client throws if bilet is null, so if we get here it's valid)
			// CRITICAL: Stop immediately before dispatching
			stop()
			dispatch({ type: 'RESERVATION_SUCCESS', result })

			if (onSuccess) {
				onSuccess(result)
			}

			return true
		} catch (error) {
			// CRITICAL: Check phase again after error - might have succeeded elsewhere
			if (stateRef.current.phase === 'success') {
				stop()
				return false
			}

			// Log the error
			const errorLog = createErrorLog(error, {
				slotDate: slot.date,
				slotIndex,
				locationId: params.locationId
			})
			dispatch({ type: 'LOG_RESERVATION_ERROR', error: errorLog })

			// Check for hard rate limit - stop completely
			if (isHardRateLimit(error)) {
				console.error('[RESERVATION] Hard rate limit detected - stopping')
				stop()
				return false
			}

			// Slot unavailable - try next slot immediately
			if (error instanceof SlotUnavailableError) {
				dispatch({ type: 'TRY_NEXT_SLOT' })
				await sleep(SLOT_SWITCH_DELAY)
				return false
			}

			// Other errors - retry same slot after delay
			await sleep(RETRY_DELAY)
			return false
		}
	}, [client, dispatch, onSuccess, stop])

	const runReservationLoop = useCallback(async () => {
		if (isRunningRef.current) {
			return
		}
		isRunningRef.current = true

		// CRITICAL: Use a function to get current state, not closure
		const checkShouldContinue = () => isRunningRef.current && stateRef.current.phase !== 'success'

		while (checkShouldContinue()) {
			const currentState = stateRef.current

			// Double-check phase before each iteration
			if (currentState.phase === 'success') {
				stop()
				break
			}

			// Wait for slots to be available
			if (currentState.search.slots.length === 0) {
				await sleep(100)
				continue
			}

			// Attempt reservation
			const success = await attemptReservation()

			if (success || stateRef.current.phase === 'success') {
				isRunningRef.current = false
				break
			}

			// Small delay before next attempt
			await sleep(100)
		}

		isRunningRef.current = false
	}, [attemptReservation, stop])

	// Start reservation when enabled and we have slots
	useEffect(() => {
		// CRITICAL: Never start if already succeeded
		if (state.phase === 'success') {
			stop()
			return
		}

		if (
			enabled &&
			state.search.slots.length > 0 &&
			!isRunningRef.current
		) {
			// Fetch consulate details first if not already done
			if (
				!state.reservation.consulateDetails &&
				state.search.checkSlotsResult?.consulateId &&
				state.params
			) {
				client
					.getConsulateDetails({
						consulateId: String(state.search.checkSlotsResult.consulateId),
						languageVersion: 1
					})
					.then(details => {
						dispatch({ type: 'START_RESERVATION', consulateDetails: details })
						runReservationLoop()
					})
					.catch(error => {
						const errorLog = createErrorLog(error, { context: 'getConsulateDetails' })
						dispatch({ type: 'LOG_RESERVATION_ERROR', error: errorLog })
					})
			} else if (state.reservation.consulateDetails) {
				runReservationLoop()
			}
		}

		return () => {
			stop()
		}
	}, [
		enabled,
		state.search.slots.length,
		state.phase,
		state.reservation.consulateDetails,
		state.search.checkSlotsResult?.consulateId,
		state.params,
		client,
		dispatch,
		runReservationLoop,
		stop
	])

	return {
		isBooking: state.reservation.isRunning,
		attempts: state.reservation.attempts,
		currentSlotIndex: state.reservation.currentSlotIndex,
		result: state.reservation.result,
		stop
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
