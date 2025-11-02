/**
 * Operation - Entity representing a bookable operation
 *
 * Domain entity representing an operation that can be booked.
 * This is identified by its display text (e.g., "Obywatelstwo polskie").
 */
export class Operation {
	readonly text: string

	constructor(text: string) {
		if (!text || text.trim().length === 0) {
			throw new Error('Operation text cannot be empty')
		}
		this.text = text
	}

	/**
	 * Checks if this operation matches the given text (case-insensitive)
	 */
	matches(text: string): boolean {
		return this.text.toLowerCase().trim() === text.toLowerCase().trim()
	}
}
