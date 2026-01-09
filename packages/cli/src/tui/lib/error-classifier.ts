/**
 * Error classification utilities for e-konsulat API responses
 * Based on real API behavior analysis from HAR captures
 */

// Known API error reasons from response body
export type ApiErrorReason =
	| 'LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY' // HARD rate limit - 24 hours (HTTP 400)
	| 'BRAK_WOLNYCH_TERMINOW' // No available slots
	| 'NIEPRAWIDLOWY_TOKEN' // Invalid token
	| 'TERMIN_ZAJETY' // Slot already taken
	| 'SLOT_UNAVAILABLE' // Our custom: bilet=null on HTTP 200
	| string // Other unknown reasons

// Error log types for tracking
export type ErrorType =
	| 'rate_limit_hard'
	| 'rate_limit_soft'
	| 'network'
	| 'timeout'
	| 'api'
	| 'captcha'
	| 'slot_unavailable'
	| 'unknown'

export interface ErrorLog {
	timestamp: Date
	type: ErrorType
	message: string
	reason?: ApiErrorReason
	context?: Record<string, unknown>
}

export interface ApiErrorResponse {
	reason?: ApiErrorReason
	[key: string]: unknown
}

/**
 * Check if error is a hard rate limit (24 hour ban from too many bookings)
 */
export function isHardRateLimit(error: unknown): boolean {
	if (error instanceof ApiError) {
		return error.reason === 'LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY'
	}
	if (typeof error === 'object' && error !== null && 'reason' in error) {
		return (error as ApiErrorResponse).reason === 'LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY'
	}
	return false
}

/**
 * Check if error is a soft rate limit (few seconds, from checking too frequently)
 */
export function isSoftRateLimit(error: unknown): boolean {
	// Soft rate limits typically come as HTTP 429 or similar
	// They resolve in a few seconds
	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		if (message.includes('429') || message.includes('too many requests')) {
			return true
		}
	}
	return false
}

/**
 * Custom error class for API errors with reason field
 */
export class ApiError extends Error {
	readonly reason: ApiErrorReason
	readonly statusCode: number

	constructor(message: string, reason: ApiErrorReason, statusCode = 400) {
		super(message)
		this.name = 'ApiError'
		this.reason = reason
		this.statusCode = statusCode
	}
}

/**
 * Custom error class for slot unavailable (HTTP 200 with null bilet)
 */
export class SlotUnavailableError extends Error {
	readonly reason: ApiErrorReason = 'SLOT_UNAVAILABLE'

	constructor(message = 'Slot is no longer available') {
		super(message)
		this.name = 'SlotUnavailableError'
	}
}

/**
 * Classify an error into one of our error types
 */
export function classifyError(error: unknown): ErrorType {
	// Check for our custom error types first
	if (error instanceof SlotUnavailableError) {
		return 'slot_unavailable'
	}

	if (error instanceof ApiError) {
		if (error.reason === 'LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY') {
			return 'rate_limit_hard'
		}
		return 'api'
	}

	if (!(error instanceof Error)) {
		return 'unknown'
	}

	const message = error.message.toLowerCase()

	// Hard rate limit check
	if (message.includes('limit_z_jednego_ip')) {
		return 'rate_limit_hard'
	}

	// Soft rate limit check
	if (message.includes('429') || message.includes('too many')) {
		return 'rate_limit_soft'
	}

	// Timeout
	if (message.includes('timeout') || error.name === 'TimeoutError' || error.name === 'AbortError') {
		return 'timeout'
	}

	// CAPTCHA errors
	if (message.includes('captcha')) {
		if (message.includes('403')) {
			return 'rate_limit_soft'
		}
		return 'captcha'
	}

	// Network errors
	if (
		message.includes('network') ||
		message.includes('fetch') ||
		message.includes('econnrefused') ||
		message.includes('enotfound')
	) {
		return 'network'
	}

	// Generic HTTP errors
	if (message.includes('http') || message.includes('status')) {
		if (message.includes('403')) {
			return 'rate_limit_soft'
		}
		return 'api'
	}

	return 'unknown'
}

/**
 * Create an error log entry
 */
export function createErrorLog(error: unknown, context?: Record<string, unknown>): ErrorLog {
	const type = classifyError(error)
	const message = error instanceof Error ? error.message : String(error)
	const reason = error instanceof ApiError ? error.reason : undefined

	return {
		timestamp: new Date(),
		type,
		message,
		reason,
		context
	}
}

/**
 * Get human-readable description of error type
 */
export function getErrorTypeDescription(type: ErrorType): string {
	switch (type) {
		case 'rate_limit_hard':
			return 'IP banned (24h)'
		case 'rate_limit_soft':
			return 'Rate limited'
		case 'network':
			return 'Network error'
		case 'timeout':
			return 'Timeout'
		case 'api':
			return 'API error'
		case 'captcha':
			return 'CAPTCHA failed'
		case 'slot_unavailable':
			return 'Slot taken'
		default:
			return 'Unknown error'
	}
}

/**
 * Summarize error logs by type
 */
export function summarizeErrors(errors: ErrorLog[]): Record<ErrorType, number> {
	const summary: Record<ErrorType, number> = {
		rate_limit_hard: 0,
		rate_limit_soft: 0,
		network: 0,
		timeout: 0,
		api: 0,
		captcha: 0,
		slot_unavailable: 0,
		unknown: 0
	}

	for (const error of errors) {
		summary[error.type]++
	}

	return summary
}
