export interface DateRange {
	start: string // ISO date string
	end: string // ISO date string
}

export interface OperationDayData {
	operationId: number
	availableDays: string[] // Array of ISO date strings
	disabledDays: DateRange[] // Array of date ranges
	minDate: string // ISO date string
	maxDate: string // ISO date string
}

export interface GetAvailableDaysResponse {
	success: boolean
	days: OperationDayData[]
	message?: string
	companyName?: string
	lastStepId?: number
	recaptchaToken?: string
}

export interface GetAvailableDaysOptions {
	/** Text of the operation button to click (e.g., "Obywatelstwo polskie" or "PASZPORTY - Odbiór paszportu") */
	operationText: string
	/** Whether to run browser in headless mode (default: true) */
	headless?: boolean
	/** Navigation timeout in milliseconds (default: 30000) */
	navigationTimeout?: number
	/** API response wait timeout in milliseconds (default: 30000) */
	apiTimeout?: number
	/** Delay after clicking operation button in milliseconds (default: 500) */
	operationClickDelay?: number
	/** Delay after clicking Next button in milliseconds (default: 0) */
	nextButtonClickDelay?: number
	/** Maximum number of retries for API call (default: 0) */
	maxRetries?: number
	/** Retry delay in milliseconds (default: 1000) */
	retryDelay?: number
}
