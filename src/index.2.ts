// https://rejestracjapoznan.poznan.uw.gov.pl/

import { chromium } from 'playwright'
import type { Browser, Page, Response } from 'playwright'
import ora from 'ora'

interface DateRange {
	start: string // ISO date string
	end: string // ISO date string
}

interface OperationDayData {
	operationId: number
	availableDays: string[] // Array of ISO date strings
	disabledDays: DateRange[] // Array of date ranges
	minDate: string // ISO date string
	maxDate: string // ISO date string
}

interface GetAvailableDaysResponse {
	success: boolean
	days: OperationDayData[]
	message?: string
	companyName?: string
	lastStepId?: number
	recaptchaToken?: string
}

interface GetAvailableDaysOptions {
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

interface InternalState {
	browser: Browser | null
	page: Page | null
}

/**
 * Gets available days for an operation by automating browser interactions:
 * - Opens the page
 * - Clicks an operation button by text
 * - Clicks "Dalej" (Next) button
 * - Intercepts the API response
 *
 * @param options - Configuration options
 * @returns Response data with available days
 */
export async function getAvailableDaysForOperation(
	options: GetAvailableDaysOptions
): Promise<GetAvailableDaysResponse> {
	const {
		operationText,
		headless = true,
		navigationTimeout = 30000,
		apiTimeout = 30000,
		operationClickDelay = 500,
		nextButtonClickDelay = 0,
		maxRetries = 0,
		retryDelay = 1000
	} = options

	const baseUrl = 'https://rejestracjapoznan.poznan.uw.gov.pl'
	const state: InternalState = {
		browser: null,
		page: null
	}

	let lastError: Error | undefined

	const spinner = ora('Initializing browser').start()

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			if (attempt > 0) {
				spinner.warn(`Retrying... (attempt ${attempt + 1}/${maxRetries + 1})`)
				await new Promise(resolve => setTimeout(resolve, retryDelay))
			}

			spinner.text = 'Launching browser'
			// Launch browser
			state.browser = await chromium.launch({
				headless
			})

			spinner.text = 'Creating page'
			// Create a new page
			state.page = await state.browser.newPage()

			// Set up response interception to capture the API call
			const responsePromise = state.page.waitForResponse(
				response => {
					const url = response.url()
					return url.includes('/api/Slot/GetAvailableDaysForOperation')
				},
				{ timeout: apiTimeout }
			)

			spinner.text = 'Navigating to reservation page'
			// Navigate to the reservation page
			await state.page.goto(baseUrl, {
				waitUntil: 'domcontentloaded',
				timeout: navigationTimeout
			})

			spinner.text = 'Waiting for page to load'
			// Wait for the page to fully load - wait for operation buttons
			await state.page.waitForSelector('button.operation-button', {
				timeout: 15000
			})

			spinner.text = 'Initializing application'
			// Wait for Vue app to initialize (ensure sessionStorage has token)
			await state.page.waitForFunction(
				() => {
					return sessionStorage.getItem('token') !== null
				},
				{ timeout: 10000 }
			)

			spinner.text = `Selecting operation: ${operationText}`
			// Click on the operation button by text
			const operationButton = state.page.getByRole('button', {
				name: operationText,
				exact: false
			})
			await operationButton.waitFor({ state: 'visible', timeout: 5000 })
			await operationButton.click()

			// Wait for selection to register
			if (operationClickDelay > 0) {
				await state.page.waitForTimeout(operationClickDelay)
			}

			spinner.text = 'Clicking Next button'
			// Find and click the "Dalej" (Next) button
			const nextButton = state.page.getByRole('button', { name: /Dalej/i })

			// Wait for the button to be enabled
			await nextButton.waitFor({ state: 'visible', timeout: 5000 })

			// Delay before clicking Next button if specified
			if (nextButtonClickDelay > 0) {
				await state.page.waitForTimeout(nextButtonClickDelay)
			}

			// Click the Next button - this triggers the API call
			await nextButton.click()

			spinner.text = 'Waiting for API response'
			// Wait for the API response
			const response: Response = await responsePromise

			// Extract the request details
			const request = response.request()
			const requestUrl = new URL(request.url())

			const companyName = requestUrl.searchParams.get('companyName') || ''
			const extractedLastStepId = Number.parseInt(
				requestUrl.searchParams.get('lastStepId') || '0',
				10
			)
			const recaptchaToken = requestUrl.searchParams.get('recaptchaToken') || ''

			// Parse response body
			let responseData: any
			try {
				responseData = await response.json()
			} catch (e) {
				const text = await response.text()
				throw new Error(`Failed to parse response as JSON: ${text}`)
			}

			spinner.text = 'Processing response'
			// Clean up browser resources
			await cleanup(state)

			// Check if response indicates an error
			if (!response.ok()) {
				spinner.fail('API request failed')
				return {
					success: false,
					days: [],
					message: responseData.message || `HTTP ${response.status()}: ${response.statusText()}`,
					companyName,
					lastStepId: extractedLastStepId,
					recaptchaToken
				}
			}

			// Handle response structure
			// Response is an object with a 'days' array
			if (typeof responseData === 'object' && responseData !== null) {
				// If response has a message indicating an error
				if (responseData.message || responseData.error) {
					spinner.fail(responseData.message || responseData.error || 'Request failed')
					return {
						success: false,
						days: [],
						message: responseData.message || responseData.error,
						companyName,
						lastStepId: extractedLastStepId,
						recaptchaToken
					}
				}

				// Response has a 'days' array with operation data
				const days = Array.isArray(responseData.days) ? responseData.days : []
				const hasAvailable = days.some(
					(day: OperationDayData) => day.availableDays && day.availableDays.length > 0
				)

				if (hasAvailable) {
					spinner.succeed('Available slots found')
				} else {
					spinner.info('No available slots found')
				}

				return {
					success: true,
					days,
					companyName,
					lastStepId: extractedLastStepId,
					recaptchaToken
				}
			}

			spinner.fail('Unexpected response format')
			return {
				success: false,
				days: [],
				message: 'Unexpected response format',
				companyName,
				lastStepId: extractedLastStepId,
				recaptchaToken
			}
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			// Clean up on error
			await cleanup(state)

			// If this was the last attempt, throw the error
			if (attempt === maxRetries) {
				spinner.fail(`Failed after ${attempt + 1} attempt(s): ${lastError.message}`)
				throw new Error(
					`Failed to get available days after ${attempt + 1} attempt(s): ${lastError.message}`
				)
			}
		}
	}

	// This should never be reached, but TypeScript needs it
	spinner.fail(`Unexpected error: ${lastError?.message || 'Unknown error'}`)
	throw new Error(`Unexpected error: ${lastError?.message || 'Unknown error'}`)
}

/**
 * Cleans up browser resources
 */
async function cleanup(state: InternalState): Promise<void> {
	try {
		if (state.page) {
			await state.page.close()
			state.page = null
		}
	} catch (error) {
		// Ignore cleanup errors
	}

	try {
		if (state.browser) {
			await state.browser.close()
			state.browser = null
		}
	} catch (error) {
		// Ignore cleanup errors
	}
}

/**
 * Checks if there are available days in the response
 */
export function hasAvailableDays(response: GetAvailableDaysResponse): boolean {
	return response.days.some(day => day.availableDays && day.availableDays.length > 0)
}

/**
 * Gets the total count of available days across all operations
 */
export function getTotalAvailableDays(response: GetAvailableDaysResponse): number {
	return response.days.reduce((sum, day) => sum + (day.availableDays?.length || 0), 0)
}

async function main(): Promise<void> {
	try {
		// Check for operation "Obywatelstwo polskie" (usually no slots)
		// Use "PASZPORTY - Odbiór paszportu" to see available slots structure
		const result = await getAvailableDaysForOperation({
			operationText: 'Obywatelstwo polskie',
			headless: true,
			navigationTimeout: 30000,
			apiTimeout: 30000,
			maxRetries: 2,
			retryDelay: 2000
		})

		const hasAvailable = hasAvailableDays(result)
		const totalAvailable = getTotalAvailableDays(result)

		// eslint-disable-next-line no-console
		console.log('\n=== Slot Availability Check ===')
		// eslint-disable-next-line no-console
		console.log(`Operation ID: ${result.lastStepId}`)
		// eslint-disable-next-line no-console
		console.log(`Company Name: ${result.companyName}`)
		// eslint-disable-next-line no-console
		console.log(`Success: ${result.success}`)
		// eslint-disable-next-line no-console
		console.log(`Operations: ${result.days.length}`)
		// eslint-disable-next-line no-console
		console.log(`Total Available Days: ${totalAvailable}`)
		// eslint-disable-next-line no-console
		console.log(`Has Available Slots: ${hasAvailable ? 'YES ✓' : 'NO ✗'}`)
		if (result.message) {
			// eslint-disable-next-line no-console
			console.log(`Message: ${result.message}`)
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('\n❌ Error:', error instanceof Error ? error.message : String(error))
		process.exit(1)
	}
}

main()
