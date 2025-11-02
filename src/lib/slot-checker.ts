import type { Response } from 'playwright'
import type { GetAvailableDaysOptions, GetAvailableDaysResponse } from './types.ts'
import type { BrowserManager } from './browser-manager.ts'

/**
 * Gets available days for an operation using an existing browser page
 */
export async function checkAvailableSlots(
	browserManager: BrowserManager,
	options: GetAvailableDaysOptions
): Promise<GetAvailableDaysResponse> {
	const {
		operationText,
		apiTimeout = 30000,
		operationClickDelay = 500,
		nextButtonClickDelay = 0
	} = options

	const page = await browserManager.getPage()

	// Set up response interception to capture the API call
	const responsePromise = page.waitForResponse(
		response => {
			const url = response.url()
			return url.includes('/api/Slot/GetAvailableDaysForOperation')
		},
		{ timeout: apiTimeout }
	)

	// Click on the operation button by text
	const operationButton = page.getByRole('button', {
		name: operationText,
		exact: false
	})
	await operationButton.waitFor({ state: 'visible', timeout: 5000 })
	await operationButton.click()

	// Wait for selection to register
	if (operationClickDelay > 0) {
		await page.waitForTimeout(operationClickDelay)
	}

	// Find and click the "Dalej" (Next) button
	const nextButton = page.getByRole('button', { name: /Dalej/i })

	// Wait for the button to be enabled
	await nextButton.waitFor({ state: 'visible', timeout: 5000 })

	// Delay before clicking Next button if specified
	if (nextButtonClickDelay > 0) {
		await page.waitForTimeout(nextButtonClickDelay)
	}

	// Click the Next button - this triggers the API call
	await nextButton.click()

	// Wait for the API response
	const response: Response = await responsePromise

	// Extract the request details
	const request = response.request()
	const requestUrl = new URL(request.url())

	const companyName = requestUrl.searchParams.get('companyName') || ''
	const extractedLastStepId = Number.parseInt(requestUrl.searchParams.get('lastStepId') || '0', 10)
	const recaptchaToken = requestUrl.searchParams.get('recaptchaToken') || ''

	// Parse response body
	let responseData: any
	try {
		responseData = await response.json()
	} catch (e) {
		const text = await response.text()
		throw new Error(`Failed to parse response as JSON: ${text}`)
	}

	// Check if response indicates an error
	if (!response.ok()) {
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
	// Response can be either:
	// 1. An object with a 'days' array
	// 2. The operation day data directly (single object)
	if (typeof responseData === 'object' && responseData !== null) {
		// If response has a message indicating an error
		if (responseData.message || responseData.error) {
			return {
				success: false,
				days: [],
				message: responseData.message || responseData.error,
				companyName,
				lastStepId: extractedLastStepId,
				recaptchaToken
			}
		}

		// Check if response has a 'days' array (wrapped format)
		if (Array.isArray(responseData.days)) {
			return {
				success: true,
				days: responseData.days,
				companyName,
				lastStepId: extractedLastStepId,
				recaptchaToken
			}
		}

		// Response is the operation day data directly (has operationId, availableDays, etc.)
		if (typeof responseData.operationId === 'number' || responseData.availableDays) {
			return {
				success: true,
				days: [responseData],
				companyName,
				lastStepId: extractedLastStepId,
				recaptchaToken
			}
		}

		// If response has a 'days' property that's not an array, treat as empty
		return {
			success: true,
			days: [],
			companyName,
			lastStepId: extractedLastStepId,
			recaptchaToken
		}
	}

	return {
		success: false,
		days: [],
		message: 'Unexpected response format',
		companyName,
		lastStepId: extractedLastStepId,
		recaptchaToken
	}
}
