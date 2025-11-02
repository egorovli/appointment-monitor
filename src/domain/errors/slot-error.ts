import { BusinessRuleError } from '../../core/errors/business-rule-error.ts'

/**
 * SlotError - Domain-specific error for slot-related operations
 */
export class SlotError extends BusinessRuleError {}

/**
 * SlotNotFoundError - Error when slots cannot be found/retrieved
 */
export class SlotNotFoundError extends SlotError {
	readonly operationText?: string

	constructor(message: string, operationText?: string) {
		super(message)
		this.operationText = operationText
	}
}

/**
 * SlotCheckFailedError - Error when slot check operation fails
 */
export class SlotCheckFailedError extends SlotError {
	readonly cause?: unknown

	constructor(message: string, cause?: unknown) {
		super(message)
		this.cause = cause
	}
}
