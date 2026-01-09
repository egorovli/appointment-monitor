/**
 * Hook for infinite slot search loop
 * Continuously checks for available slots until stopped
 */

import type { Client as EKonsulatClient } from '../../lib/e-konsulat.gov.pl/index.ts'

import { useCallback, useEffect, useRef } from 'react'

import { classifyError, createErrorLog, isHardRateLimit } from '../lib/error-classifier.ts'
import { useAppState } from './use-app-state.tsx'

export interface UseSlotSearchOptions {
	client: EKonsulatClient
	locationId: string
	amount: number
	enabled: boolean
	onSlotsFound?: (slots: string[], token: string) => void
}

export interface UseSlotSearchResult {
	isSearching: boolean
	attempts: number
	lastAttempt: Date | undefined
	slotsCount: number
	stop: () => void
}

// Delay between search attempts (ms)
const BASE_DELAY = 500
const SOFT_RATE_LIMIT_DELAY = 3000
const JITTER_MAX = 1000

function getRandomJitter(): number {
	return Math.random() * JITTER_MAX
}

export function useSlotSearch(options: UseSlotSearchOptions): UseSlotSearchResult {
	const { client, locationId, amount, enabled, onSlotsFound } = options
	const { state, dispatch } = useAppState()
	const abortRef = useRef<AbortController | null>(null)
	const isRunningRef = useRef(false)

	const stop = useCallback(() => {
		isRunningRef.current = false
		if (abortRef.current) {
			abortRef.current.abort()
			abortRef.current = null
		}
	}, [])

	const runSearch = useCallback(async () => {
		if (isRunningRef.current) {
			return
		}
		isRunningRef.current = true

		dispatch({ type: 'START_SEARCH' })

		while (isRunningRef.current && state.phase !== 'success') {
			abortRef.current = new AbortController()

			try {
				dispatch({ type: 'INCREMENT_SEARCH_ATTEMPT' })

				// Step 1: Solve CAPTCHA
				const captchaToken = await client.completeCaptcha()

				// Check if we should stop
				if (!isRunningRef.current) {
					break
				}

				// Step 2: Check slots
				const result = await client.checkSlots({
					locationId,
					amount,
					token: captchaToken,
					signal: abortRef.current.signal
				})

				// Check if we should stop
				if (!isRunningRef.current) {
					break
				}

				// Update state with results
				const slots = result.slots.map(s => s.date || '').filter(Boolean)
				dispatch({
					type: 'UPDATE_SEARCH',
					slots: result.slots,
					token: result.token || captchaToken,
					checkSlotsResult: result
				})

				// Notify if slots found
				if (slots.length > 0 && onSlotsFound && result.token) {
					onSlotsFound(slots, result.token)
				}

				// Wait before next attempt
				await sleep(BASE_DELAY + getRandomJitter())
			} catch (error) {
				// Check if we should stop
				if (!isRunningRef.current) {
					break
				}

				// Log the error
				const errorLog = createErrorLog(error, { locationId, amount })
				dispatch({ type: 'LOG_SEARCH_ERROR', error: errorLog })

				// Check for hard rate limit - stop completely
				if (isHardRateLimit(error)) {
					console.error('[SLOT SEARCH] Hard rate limit detected - stopping')
					stop()
					break
				}

				// Determine delay based on error type
				const errorType = classifyError(error)
				let delay = BASE_DELAY

				if (errorType === 'rate_limit_soft') {
					// Soft rate limit - wait longer with jitter
					delay = SOFT_RATE_LIMIT_DELAY + getRandomJitter() * 2
				} else if (errorType === 'timeout' || errorType === 'network') {
					// Network issues - slightly longer delay
					delay = BASE_DELAY * 2 + getRandomJitter()
				}

				await sleep(delay)
			}
		}

		isRunningRef.current = false
	}, [client, locationId, amount, dispatch, onSlotsFound, state.phase, stop])

	// Start/stop search based on enabled prop
	useEffect(() => {
		if (enabled && !isRunningRef.current) {
			runSearch()
		} else if (!enabled && isRunningRef.current) {
			stop()
		}

		return () => {
			stop()
		}
	}, [enabled, runSearch, stop])

	return {
		isSearching: state.search.isRunning,
		attempts: state.search.attempts,
		lastAttempt: state.search.lastAttempt,
		slotsCount: state.search.slots.length,
		stop
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
