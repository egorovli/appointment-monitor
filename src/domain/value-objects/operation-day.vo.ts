import type { DateRange } from '../value-objects/date-range.vo.ts'

/**
 * OperationDay - Value object representing available days for an operation
 *
 * Immutable value object containing operation day data from the API.
 * This is a pure data structure with no behavior.
 */
export class OperationDay {
	readonly operationId: number
	readonly availableDays: readonly string[] // ISO date strings
	readonly disabledDays: readonly DateRange[]
	readonly minDate: string // ISO date string
	readonly maxDate: string // ISO date string

	constructor(
		operationId: number,
		availableDays: readonly string[],
		disabledDays: readonly DateRange[],
		minDate: string,
		maxDate: string
	) {
		this.operationId = operationId
		this.availableDays = availableDays
		this.disabledDays = disabledDays
		this.minDate = minDate
		this.maxDate = maxDate
	}

	/**
	 * Checks if this operation has any available days
	 */
	hasAvailableDays(): boolean {
		return this.availableDays.length > 0
	}

	/**
	 * Gets the count of available days for this operation
	 */
	getAvailableDaysCount(): number {
		return this.availableDays.length
	}
}
