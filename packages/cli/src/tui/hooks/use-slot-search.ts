/**
 * Hook for infinite slot search loop
 * Continuously checks for available slots until stopped
 */

import type { EKonsulatClient } from '../../lib/e-konsulat.gov.pl/index.ts'
import type { AppPhase } from './use-app-state.tsx'

import { useCallback, useEffect, useRef } from 'react'

import { classifyError, createErrorLog, isHardRateLimit } from '../lib/error-classifier.ts'
import { notifySlotsFound } from '../lib/notifications.ts'
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
const CAPTCHA_FAILURE_DELAY = 2500 // Base delay for CAPTCHA failures (slightly higher to ease soft failures)
const CAPTCHA_BACKOFF_MULTIPLIER = 1.7 // Exponential backoff multiplier
const CAPTCHA_MAX_DELAY = 12000 // Maximum delay for CAPTCHA backoff
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
	const phaseRef = useRef<AppPhase>(state.phase) // Track current phase to avoid stale closures
	const paramsRef = useRef(state.params)
	const lastNotifiedTokenRef = useRef<string | undefined>(undefined)

	const logEvent = useCallback(
		(message: string, level: 'info' | 'warn' | 'error' = 'info') => {
			dispatch({
				type: 'APPEND_LOG',
				entry: {
					timestamp: new Date(),
					level,
					message
				}
			})
		},
		[dispatch]
	)

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

		dispatch({ type: 'START_SEARCH' })
		lastNotifiedTokenRef.current = undefined
		logEvent(
			`[SEARCH] Started${paramsRef.current ? ` (${paramsRef.current.consulateName} / ${paramsRef.current.serviceName})` : ''}`
		)

		// CRITICAL: Use ref to check current phase, not closure
		const checkShouldContinue = () => isRunningRef.current && phaseRef.current !== 'success'

		while (checkShouldContinue()) {
			abortRef.current = new AbortController()

			try {
				dispatch({ type: 'INCREMENT_SEARCH_ATTEMPT' })
				dispatch({ type: 'INCREMENT_CAPTCHA_ATTEMPT' })

				// Step 1: Solve CAPTCHA
				const captchaStart = Date.now()
				const captchaToken = await client.completeCaptcha()
				const captchaDuration = Date.now() - captchaStart
				dispatch({ type: 'LOG_CAPTCHA_SUCCESS', durationMs: captchaDuration })
				logEvent(`[CAPTCHA] Solved in ${(captchaDuration / 1000).toFixed(2)}s`)

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

				// Check if we should stop
				if (!isRunningRef.current) {
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

				if (slots.length > 0 && result.token && lastNotifiedTokenRef.current !== result.token) {
					lastNotifiedTokenRef.current = result.token
					const locationName = paramsRef.current?.consulateName ?? paramsRef.current?.locationName
					logEvent(
						`[SEARCH] Slots found (${slots.length})${locationName ? ` @ ${locationName}` : ''}`
					)
					notifySlotsFound({
						count: slots.length,
						locationName
					})
				}

				// Notify if slots found
				if (slots.length > 0 && onSlotsFound && result.token) {
					onSlotsFound(slots, result.token)
				}

				// Wait before next attempt
				await sleep(BASE_DELAY + getRandomJitter())
			} catch (error) {
				// Check if we should stop
				if (!isRunningRef.current) {
					stop()
					break
				}

				// Log the error
				const errorLog = createErrorLog(error, { locationId, amount })
				dispatch({ type: 'LOG_SEARCH_ERROR', error: errorLog })
				const errorType = classifyError(error)
				logEvent(
					`[SEARCH] Error (${errorType}): ${
						error instanceof Error ? error.message : String(error)
					}`,
					errorType === 'rate_limit_hard' ? 'warn' : 'error'
				)

				// Check for hard rate limit - stop completely
				if (isHardRateLimit(error)) {
					console.error('[SLOT SEARCH] Hard rate limit detected - stopping')
					logEvent('[SEARCH] Hard rate limit detected - stopping', 'warn')
					stop()
					break
				}

				// Determine delay based on error type
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
	}, [client, locationId, amount, dispatch, logEvent, onSlotsFound, stop])

	// Update phase ref when state changes
	useEffect(() => {
		phaseRef.current = state.phase
		paramsRef.current = state.params
		if (state.phase === 'success') {
			stop()
		}
	}, [state.phase, state.params, stop])

	// Start/stop search based on enabled prop
	useEffect(() => {
		// CRITICAL: Never start if already succeeded
		if (phaseRef.current === 'success') {
			stop()
			return
		}

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
