// https://rejestracjapoznan.poznan.uw.gov.pl/

import { chromium } from 'playwright'
import type { Browser, Page, Response } from 'playwright'

interface AvailableSlotResponse {
	companyName: string
	lastStepId: number
	recaptchaToken: string
	responseData: any
}

interface CheckSlotsOptions {
	operationIndex?: number // Index of operation button to select (0-based)
	operationId?: number // Operation ID (lastStepId) to select (e.g., 2, 12). Takes precedence over operationIndex
	headless?: boolean // Run browser in headless mode (default: true)
	timeout?: number // Timeout in milliseconds (default: 30000)
}

/**
 * Checks available slots by automating the browser flow and intercepting the API call.
 * Uses the same parameters as the page uses in its HTTP call.
 *
 * Note: `lastStepId` in the API call is actually the operation ID, not the step number.
 * Available operations:
 * - Operation ID 1: "PASZPORTY - Składanie wniosków o paszport" → lastStepId=1
 * - Operation ID 2: "PASZPORTY - Odbiór paszportu" → lastStepId=2 (has available slots)
 * - Operation ID 7: "CUDZOZIEMCY - Odbiór..." → lastStepId=7
 * - Operation ID 10: "CUDZOZIEMCY - Uzyskanie stempla..." → lastStepId=10
 * - Operation ID 12: "Obywatelstwo polskie" → lastStepId=12 (usually no slots)
 *
 * @param options Configuration options for the slot check
 * @returns Promise resolving to the API response data including parameters used
 */
export async function checkAvailableSlots(
	options: CheckSlotsOptions = {}
): Promise<AvailableSlotResponse> {
	const { operationIndex, operationId, headless = true, timeout = 30000 } = options

	const baseUrl = 'https://rejestracjapoznan.poznan.uw.gov.pl'

	let browser: Browser | null = null
	let page: Page | null = null

	try {
		// Launch browser
		browser = await chromium.launch({
			headless
		})

		// Create a new page
		page = await browser.newPage()

		// Set up response interception to capture the API call
		const responsePromise = page.waitForResponse(
			response => {
				const url = response.url()
				return url.includes('/api/Slot/GetAvailableDaysForOperation')
			},
			{ timeout }
		)

		// Navigate to the reservation page
		await page.goto(baseUrl, { waitUntil: 'networkidle' })

		// Wait for the page to fully load and Vue app to initialize
		await page.waitForSelector('button[type="button"]', { timeout: 10000 })

		// Wait for the operation buttons to be available
		// The operation buttons are in tabpanel "1"
		await page.waitForSelector('tabpanel[role="tabpanel"] button[type="button"]', {
			timeout: 10000
		})

		// Get operations data from Vue component to map IDs to indices
		const operationsData = await page.evaluate(() => {
			const app = (globalThis as any).document.querySelector('#app')
			if (!app || !app.__vue__) {
				return null
			}

			function findReservationComponent(vm: any): any {
				if (!vm) {
					return null
				}
				if (vm.$options.name === 'reservation') {
					return vm
				}
				if (vm.$children) {
					for (const child of vm.$children) {
						const found = findReservationComponent(child)
						if (found) {
							return found
						}
					}
				}
				return null
			}

			const reservation = findReservationComponent(app.__vue__.$root)
			if (!reservation) {
				return null
			}

			return (reservation.operations || []).map((op: any, idx: number) => ({
				index: idx,
				id: op.id,
				name: op.name
			}))
		})

		if (!operationsData || operationsData.length === 0) {
			throw new Error('Failed to load operations data from page')
		}

		// Determine which operation button to click
		let targetIndex: number

		if (operationId !== undefined) {
			// Find operation by ID
			const operation = operationsData.find((op: any) => op.id === operationId)
			if (!operation) {
				throw new Error(
					`Operation with ID ${operationId} not found. Available operations: ${operationsData.map((op: any) => `${op.id} (${op.name})`).join(', ')}`
				)
			}
			targetIndex = operation.index
		} else {
			// Use operationIndex or default to 0
			targetIndex = operationIndex ?? 0
			if (targetIndex >= operationsData.length) {
				throw new Error(
					`Operation index ${targetIndex} is out of range. Found ${operationsData.length} operations.`
				)
			}
		}

		// Get all operation buttons
		const operationButtons = await page
			.locator('tabpanel[role="tabpanel"] button[type="button"]')
			.all()

		if (operationButtons.length === 0) {
			throw new Error('No operation buttons found on the page')
		}

		// Click on the selected operation button
		const selectedButton = operationButtons[targetIndex]
		if (!selectedButton) {
			throw new Error(`Operation button at index ${targetIndex} not found`)
		}

		const selectedOperation = operationsData[targetIndex]

		await selectedButton.click()

		// Wait a bit for the selection to register
		await page.waitForTimeout(500)

		// Find and click the "Dalej" (Next) button
		const nextButton = page.getByRole('button', { name: /Dalej/i })

		// Wait for the button to be enabled
		await nextButton.waitFor({ state: 'visible', timeout: 5000 })

		// Click the Next button - this triggers the API call
		await nextButton.click()

		// Wait for the API response
		const response: Response = await responsePromise

		// Extract the request details
		const request = response.request()
		const requestUrl = new URL(request.url())

		const companyName = requestUrl.searchParams.get('companyName') || ''
		const lastStepId = Number.parseInt(requestUrl.searchParams.get('lastStepId') || '0', 10)
		const recaptchaToken = requestUrl.searchParams.get('recaptchaToken') || ''

		// Parse the response body
		let responseData: any
		try {
			responseData = await response.json()
		} catch (e) {
			// If response is not JSON, get text
			responseData = await response.text()
		}

		return {
			companyName,
			lastStepId,
			recaptchaToken,
			responseData
		}
	} catch (error) {
		throw new Error(
			`Failed to check available slots: ${error instanceof Error ? error.message : String(error)}`
		)
	} finally {
		// Clean up
		if (page) {
			await page.close()
		}
		if (browser) {
			await browser.close()
		}
	}
}

async function main(): Promise<void> {
	try {
		// Use operationId=2 to get available slots (for data structure analysis)
		// Use operationId=12 for the actual operation you need (Obywatelstwo polskie)
		const result = await checkAvailableSlots({
			operationId: 2, // Operation ID 2: "PASZPORTY - Odbiór paszportu" (has available slots)
			// operationId: 12, // Operation ID 12: "Obywatelstwo polskie" (usually no slots)
			headless: false, // Set to true to run in headless mode
			timeout: 30000
		})
	} catch (error) {
		process.exit(1)
	}
}

main().catch(err => {
	process.exit(1)
})
