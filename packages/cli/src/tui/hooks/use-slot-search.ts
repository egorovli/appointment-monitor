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
const CAPTCHA_FAILURE_DELAY = 2000 // Base delay for CAPTCHA failures
const CAPTCHA_BACKOFF_MULTIPLIER = 1.5 // Exponential backoff multiplier
const CAPTCHA_MAX_DELAY = 10000 // Maximum delay for CAPTCHA backoff
const JITTER_MAX = 1000

function getRandomJitter(): number {
	return Math.random() * JITTER_MAX
}

export function useSlotSearch(options: UseSlotSearchOptions): UseSlotSearchResult {
	const { client, locationId, amount, enabled, onSlotsFound } = options
	const { state, dispatch } = useAppState()
	const abortRef = useRef<AbortController | null>(null)
	const isRunningRef = useRef(false)
	const captchaFailureCountRef = useRef(0) // Track consecutive CAPTCHA failures for backoff
	const phaseRef = useRef(state.phase) // Track current phase to avoid stale closures

	const stop = useCallback(() => {
		isRunningRef.current = false
		captchaFailureCountRef.current = 0 // Reset CAPTCHA failure count when stopping
		if (abortRef.current) {
			abortRef.current.abort()
			abortRef.current = null
		}
	}, [])

	const runSearch = useCallback(async () => {
		if (isRunningRef.current || phaseRef.current === 'success') {
			return
		}
		isRunningRef.current = true
		// Set phase ref immediately so loops respect the new phase before React processes dispatches
		phaseRef.current = 'searching'

		dispatch({ type: 'START_SEARCH' })

		// CRITICAL: Use ref to check current phase, not closure
		const checkShouldContinue = () => isRunningRef.current && phaseRef.current !== 'success'

		while (checkShouldContinue()) {
			// Double-check phase before each iteration
			if (phaseRef.current === 'success') {
				stop()
				break
			}
			abortRef.current = new AbortController()

			try {
				dispatch({ type: 'INCREMENT_SEARCH_ATTEMPT' })
				dispatch({ type: 'INCREMENT_CAPTCHA_ATTEMPT' })

				// Step 1: Solve CAPTCHA
				const captchaToken = await client.completeCaptcha()

				// Reset CAPTCHA failure count on success
				captchaFailureCountRef.current = 0

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

				// Check if we should stop (including success phase)
				if (!isRunningRef.current || phaseRef.current === 'success') {
					stop()
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

				// Update phase ref after dispatch (state will update on next render)
				// We'll check it in the next iteration

				// Notify if slots found
				if (slots.length > 0 && onSlotsFound && result.token) {
					onSlotsFound(slots, result.token)
				}

				// Wait before next attempt
				await sleep(BASE_DELAY + getRandomJitter())
			} catch (error) {
				// Check if we should stop (including success phase)
				if (!isRunningRef.current || phaseRef.current === 'success') {
					stop()
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

				if (errorType === 'captcha') {
					// CAPTCHA failure - exponential backoff
					captchaFailureCountRef.current++
					const backoffDelay =
						CAPTCHA_FAILURE_DELAY *
						CAPTCHA_BACKOFF_MULTIPLIER ** (captchaFailureCountRef.current - 1)
					delay = Math.min(backoffDelay, CAPTCHA_MAX_DELAY) + getRandomJitter()
				} else if (errorType === 'rate_limit_soft') {
					// Soft rate limit - wait longer with jitter
					delay = SOFT_RATE_LIMIT_DELAY + getRandomJitter() * 2
					// Reset CAPTCHA failure count on rate limit (different error type)
					captchaFailureCountRef.current = 0
				} else if (errorType === 'timeout' || errorType === 'network') {
					// Network issues - slightly longer delay
					delay = BASE_DELAY * 2 + getRandomJitter()
					// Reset CAPTCHA failure count on network error (different error type)
					captchaFailureCountRef.current = 0
				} else {
					// Other errors - reset CAPTCHA failure count
					captchaFailureCountRef.current = 0
				}

				await sleep(delay)
			}
		}

		isRunningRef.current = false
	}, [client, locationId, amount, dispatch, onSlotsFound, stop])

	// Update phase ref when state changes
	useEffect(() => {
		phaseRef.current = state.phase
		if (state.phase === 'success') {
			stop()
		}
	}, [state.phase, stop])

	// Start/stop search based on enabled prop
	useEffect(() => {
		// CRITICAL: Never start if already succeeded
		if (phaseRef.current === 'success') {
			stop()
			return
		}

		if (enabled && !isRunningRef.current && phaseRef.current !== 'success') {
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
