import type { Operation } from '../domain/entities/operation.entity.ts'
import type { SlotAvailability } from '../domain/entities/slot-availability.entity.ts'
import type { NotificationPort } from '../domain/ports/slot-ports.port.ts'
import type { CheckSlotsOptions } from '../domain/ports/slot-ports.port.ts'

import type { CheckSlotsUseCase } from './check-slots.use-case.ts'
import { SlotCheckFailedError } from '../domain/errors/slot-error.ts'

/**
 * MonitorSlotsOptions - Options for monitoring slots
 */
export interface MonitorSlotsOptions {
	operation: Operation
	intervalSeconds: number
	checkOptions?: CheckSlotsOptions
	onSlotsFound?: (availability: SlotAvailability) => Promise<void>
	onError?: (error: Error) => Promise<void>
}

/**
 * MonitorSlotsUseCase - Use case for continuously monitoring slot availability
 *
 * Coordinates the business logic for continuously checking slot availability
 * at regular intervals until slots are found or monitoring is stopped.
 */
export class MonitorSlotsUseCase {
	constructor(
		private readonly checkSlotsUseCase: CheckSlotsUseCase,
		private readonly notificationPort?: NotificationPort
	) {}

	/**
	 * Executes the monitoring use case
	 *
	 * Continuously checks for slots at the specified interval until:
	 * - Slots are found (triggers notification and stops)
	 * - Monitoring is stopped externally
	 * - An error occurs (handled by onError callback)
	 *
	 * @param options - Monitoring options
	 * @param stopSignal - Signal to stop monitoring (checked each iteration)
	 * @returns The availability result when slots are found
	 */
	async execute(
		options: MonitorSlotsOptions,
		stopSignal?: { shouldStop: boolean }
	): Promise<SlotAvailability> {
		const { operation, intervalSeconds, checkOptions, onSlotsFound, onError } = options

		// eslint-disable-next-line no-constant-condition
		while (true) {
			// Check if we should stop
			if (stopSignal?.shouldStop) {
				break
			}

			try {
				// Check for available slots
				const result = await this.checkSlotsUseCase.execute({
					operation,
					options: checkOptions
				})

				if (!result.success || !result.availability) {
					// No slots found, continue monitoring
					await this.waitForInterval(intervalSeconds, stopSignal)
					continue
				}

				const availability = result.availability

				// Check if slots are actually available
				if (!availability.hasAvailableSlots()) {
					// No available slots, continue monitoring
					await this.waitForInterval(intervalSeconds, stopSignal)
					continue
				}

				// Slots found! Handle notification and callbacks
				await this.handleSlotsFound(availability, onSlotsFound)

				return availability
			} catch (error) {
				// Handle error
				await this.handleError(error, operation.text, onError)

				// Try to reset and continue, or rethrow if critical
				if (error instanceof SlotCheckFailedError) {
					// For check failures, try to reset and continue
					await this.waitForInterval(intervalSeconds, stopSignal)
					continue
				}

				// For other errors, rethrow
				throw error
			}
		}

		// If we exit the loop due to stop signal, throw
		throw new Error('Monitoring stopped')
	}

	/**
	 * Handles when slots are found
	 */
	private async handleSlotsFound(
		availability: SlotAvailability,
		onSlotsFound?: (availability: SlotAvailability) => Promise<void>
	): Promise<void> {
		// Send notification if port is available
		if (this.notificationPort) {
			try {
				await this.notificationPort.notifySlotsAvailable(availability)
			} catch (error) {
				// Log but don't fail - notification is best effort
			}
		}

		// Call custom callback if provided
		if (onSlotsFound) {
			await onSlotsFound(availability)
		}
	}

	/**
	 * Handles errors during monitoring
	 */
	private async handleError(
		error: unknown,
		operationText: string,
		onError?: (error: Error) => Promise<void>
	): Promise<void> {
		const domainError =
			error instanceof Error ? error : new Error(`Unknown error: ${String(error)}`)

		// Call custom error handler if provided
		if (onError) {
			await onError(domainError)
		}
	}

	/**
	 * Waits for the monitoring interval, checking stop signal periodically
	 */
	private async waitForInterval(
		intervalSeconds: number,
		stopSignal?: { shouldStop: boolean }
	): Promise<void> {
		const checkInterval = 1000 // Check every second
		const totalMs = intervalSeconds * 1000
		let elapsed = 0

		while (elapsed < totalMs) {
			if (stopSignal?.shouldStop) {
				return
			}

			const waitTime = Math.min(checkInterval, totalMs - elapsed)
			await new Promise(resolve => setTimeout(resolve, waitTime))
			elapsed += waitTime
		}
	}
}
