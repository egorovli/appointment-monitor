import type { CheckSlotsRequest, CheckSlotsResult } from '../domain/ports/slot-ports.port.ts'
import type { BrowserPort } from '../domain/ports/slot-ports.port.ts'

import { SlotCheckFailedError } from '../domain/errors/slot-error.ts'

/**
 * CheckSlotsUseCase - Use case for checking slot availability
 *
 * Coordinates the business logic for checking if slots are available
 * for a given operation. This is a pure domain use case with no
 * infrastructure dependencies.
 */
export class CheckSlotsUseCase {
	constructor(private readonly browserPort: BrowserPort) {}

	/**
	 * Executes the slot checking use case
	 *
	 * @param request - The check slots request
	 * @returns The result of checking slots
	 */
	async execute(request: CheckSlotsRequest): Promise<CheckSlotsResult> {
		try {
			// Ensure browser is initialized
			if (!this.browserPort.isInitialized()) {
				await this.browserPort.initialize()
			}

			// Check slots using the browser port
			const availability = await this.browserPort.checkSlots(request.operation, request.options)

			return {
				success: true,
				availability
			}
		} catch (error) {
			// Convert infrastructure errors to domain errors
			if (error instanceof SlotCheckFailedError) {
				throw error
			}

			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

			throw new SlotCheckFailedError(
				`Failed to check slots for operation "${request.operation.text}": ${errorMessage}`,
				error
			)
		}
	}
}
