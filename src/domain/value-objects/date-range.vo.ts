/**
 * DateRange - Value object representing a date range
 *
 * Immutable value object representing a continuous range of dates.
 */
export class DateRange {
	readonly start: string // ISO date string
	readonly end: string // ISO date string

	constructor(start: string, end: string) {
		this.start = start
		this.end = end
	}

	/**
	 * Checks if this date range is valid (start <= end)
	 */
	isValid(): boolean {
		return new Date(this.start) <= new Date(this.end)
	}
}
