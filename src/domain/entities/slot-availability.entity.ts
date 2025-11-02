import type { OperationDay } from '../value-objects/operation-day.vo.ts'

/**
 * SlotAvailability - Entity representing slot availability for an operation
 *
 * Domain entity that encapsulates the business logic for slot availability.
 * This represents the result of checking slot availability for a specific operation.
 */
export class SlotAvailability {
	readonly operationText: string
	readonly operationDays: readonly OperationDay[]
	readonly metadata?: SlotAvailabilityMetadata

	constructor(
		operationText: string,
		operationDays: readonly OperationDay[],
		metadata?: SlotAvailabilityMetadata
	) {
		this.operationText = operationText
		this.operationDays = operationDays
		this.metadata = metadata
	}

	/**
	 * Checks if any slots are available across all operations
	 */
	hasAvailableSlots(): boolean {
		return this.operationDays.some(day => day.hasAvailableDays())
	}

	/**
	 * Gets the total count of available days across all operations
	 */
	getTotalAvailableDays(): number {
		return this.operationDays.reduce((sum, day) => sum + day.getAvailableDaysCount(), 0)
	}

	/**
	 * Gets all available dates across all operations (flattened)
	 */
	getAllAvailableDates(): readonly string[] {
		return this.operationDays.flatMap(day => day.availableDays)
	}

	/**
	 * Checks if this availability result is successful
	 */
	isSuccess(): boolean {
		return this.operationDays.length > 0
	}
}

/**
 * Metadata associated with slot availability check
 */
export interface SlotAvailabilityMetadata {
	companyName?: string
	lastStepId?: number
	recaptchaToken?: string
}
