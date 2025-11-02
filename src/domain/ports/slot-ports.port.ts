import type { SlotAvailability } from '../entities/slot-availability.entity.ts'
import type { Operation } from '../entities/operation.entity.ts'

/**
 * CheckSlotsRequest - Request for checking slot availability
 */
export interface CheckSlotsRequest {
	operation: Operation
	options?: CheckSlotsOptions
}

/**
 * Options for checking slots
 */
export interface CheckSlotsOptions {
	apiTimeout?: number // milliseconds
	operationClickDelay?: number // milliseconds
	nextButtonClickDelay?: number // milliseconds
}

/**
 * CheckSlotsResult - Result of checking slot availability
 */
export interface CheckSlotsResult {
	success: boolean
	availability?: SlotAvailability
	error?: string
}

/**
 * BrowserPort - Port interface for browser automation
 *
 * Abstraction for browser operations needed to check slot availability.
 * This defines the contract that infrastructure must implement.
 */
export interface BrowserPort {
	/**
	 * Initializes the browser session
	 */
	initialize(): Promise<void>

	/**
	 * Checks slot availability for the given operation
	 *
	 * @param operation - The operation to check
	 * @param options - Optional configuration for the check
	 * @returns The slot availability result
	 */
	checkSlots(operation: Operation, options?: CheckSlotsOptions): Promise<SlotAvailability>

	/**
	 * Resets the current page to start fresh
	 */
	resetPage(): Promise<void>

	/**
	 * Checks if the browser is initialized
	 */
	isInitialized(): boolean

	/**
	 * Closes the browser session
	 */
	close(): Promise<void>
}

/**
 * NotificationPort - Port interface for sending notifications
 *
 * Abstraction for notification services (e.g., Telegram).
 * This defines the contract that infrastructure must implement.
 */
export interface NotificationPort {
	/**
	 * Sends a notification about available slots
	 *
	 * @param availability - The slot availability information
	 */
	notifySlotsAvailable(availability: SlotAvailability): Promise<void>

	/**
	 * Sends an error notification with screenshot
	 *
	 * @param error - Error details
	 * @param screenshot - Screenshot buffer (optional)
	 */
	notifyError(error: ErrorNotification): Promise<void>
}

/**
 * Error notification details
 */
export interface ErrorNotification {
	message: string
	operationText?: string
	screenshot?: Uint8Array
}
