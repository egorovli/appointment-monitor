import type { Response } from 'playwright'
import type { Page } from 'playwright'
import type { GetAvailableDaysOptions, GetAvailableDaysResponse } from './types.ts'
import type { BrowserManager } from './browser-manager.ts'
import { sendErrorScreenshot } from './telegram-notifier.ts'

/**
 * Checks if a captcha error modal is present on the page
 */
async function checkForCaptchaError(page: Page): Promise<boolean> {
	try {
		// Look for the captcha error message text
		const captchaErrorText = page.getByText(/błąd weryfikacji captcha/i, { exact: false })
		const isVisible = await captchaErrorText.isVisible({ timeout: 1000 }).catch(() => false)
		return isVisible
	} catch {
		return false
	}
}

/**
 * Closes a captcha error modal if present
 * Returns true if modal was closed, false if no modal was found
 */
async function closeCaptchaErrorModal(page: Page): Promise<boolean> {
	try {
		// Check if captcha error modal exists
		const hasError = await checkForCaptchaError(page)
		if (!hasError) {
			return false
		}

		// Try multiple strategies to close the modal

		// Strategy 1: Look for close button in the modal header (usually top-right)
		// Try various selectors for the close button
		const closeButtonSelectors = [
			'.sweet-modal .sweet-modal-close',
			'.sweet-modal button[aria-label*="close" i]',
			'.sweet-modal button[aria-label*="zamknij" i]',
			'.sweet-modal-header button',
			'.sweet-modal button.close'
		]

		// Also try finding button by text content
		const textCloseButton = page
			.locator('.sweet-modal button')
			.filter({ hasText: /×|X|zamknij/i })
			.first()

		// Try text-based button first
		try {
			const isTextButtonVisible = await textCloseButton
				.isVisible({ timeout: 500 })
				.catch(() => false)
			if (isTextButtonVisible) {
				await textCloseButton.click({ timeout: 2000 })
				await page.waitForTimeout(300)
				const stillVisible = await checkForCaptchaError(page)
				if (!stillVisible) {
					return true
				}
			}
		} catch {
			// Continue to selector-based approach if text button fails
		}

		// Try selector-based approach
		for (const selector of closeButtonSelectors) {
			try {
				const closeButton = page.locator(selector).first()
				const isVisible = await closeButton.isVisible({ timeout: 500 }).catch(() => false)

				if (isVisible) {
					await closeButton.click({ timeout: 2000 })
					await page.waitForTimeout(300)

					// Verify modal is closed
					const stillVisible = await checkForCaptchaError(page)
					if (!stillVisible) {
						return true
					}
				}
			} catch {}
		}

		// Strategy 2: Try pressing Escape key
		await page.keyboard.press('Escape')
		await page.waitForTimeout(300)

		// Check if modal is still visible
		const stillVisible = await checkForCaptchaError(page)
		return !stillVisible
	} catch {
		return false
	}
}

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

	// Check for and close any captcha error modals before clicking
	await closeCaptchaErrorModal(page)

	// Delay before clicking Next button if specified
	if (nextButtonClickDelay > 0) {
		await page.waitForTimeout(nextButtonClickDelay)
	}

	// Click the Next button - this triggers the API call
	try {
		await nextButton.click({ timeout: 30000 })
	} catch (error) {
		// Check if it's a timeout error (click timeout typically includes "Timeout" in the message)
		if (error instanceof Error && error.message.includes('Timeout')) {
			// Check if there's a captcha error modal
			const hasCaptchaError = await checkForCaptchaError(page)

			if (hasCaptchaError) {
				// Try to close the captcha error modal and retry
				const closed = await closeCaptchaErrorModal(page)

				if (closed) {
					// Wait a bit for modal to close
					await page.waitForTimeout(500)

					// Retry the click
					try {
						await nextButton.click({ timeout: 30000 })
						// If retry succeeds, continue normally
					} catch (retryError) {
						// Retry also failed, take screenshot and send error
						const screenshotBuffer = await page.screenshot({ fullPage: true })
						const errorDescription = `⚠️ Captcha error - retry failed\n\nOperation: ${operationText}\n\nError: Captcha verification error detected. Closed the modal and retried, but click still timed out after 30s.\n\nPossible causes:\n- Captcha verification is failing\n- Page state is inconsistent\n- Manual intervention may be required`

						// Send screenshot via Telegram (best effort - don't fail if Telegram fails)
						try {
							await sendErrorScreenshot(screenshotBuffer, errorDescription)
						} catch (telegramError) {
							// biome-ignore lint/suspicious/noConsole: Error logging needed here
							console.error('Failed to send error screenshot:', telegramError)
						}
						// Re-throw the retry error
						throw retryError
					}
				} else {
					// Could not close modal, take screenshot and send error
					const screenshotBuffer = await page.screenshot({ fullPage: true })
					const errorDescription = `⚠️ Captcha error detected\n\nOperation: ${operationText}\n\nError: Captcha verification error detected, but unable to close the modal automatically.\n\nThe error message is: "Wystąpił błąd weryfikacji captcha" (A captcha verification error occurred).\n\nManual intervention may be required.`

					// Send screenshot via Telegram (best effort - don't fail if Telegram fails)
					try {
						await sendErrorScreenshot(screenshotBuffer, errorDescription)
					} catch (telegramError) {
						// biome-ignore lint/suspicious/noConsole: Error logging needed here
						console.error('Failed to send error screenshot:', telegramError)
					}
					// Re-throw the original error
					throw error
				}
			} else {
				// Not a captcha error, just a general timeout
				const screenshotBuffer = await page.screenshot({ fullPage: true })
				const errorDescription = `⚠️ Click timeout error\n\nOperation: ${operationText}\n\nError: Click action timed out after 30s. A modal overlay (sweet-modal-overlay) is intercepting pointer events, preventing the "Dalej" button from being clicked.\n\nThis usually happens when:\n- A modal dialog is still open\n- The page is still loading\n- Some overlay is blocking interactions`

				// Send screenshot via Telegram (best effort - don't fail if Telegram fails)
				try {
					await sendErrorScreenshot(screenshotBuffer, errorDescription)
				} catch (telegramError) {
					// biome-ignore lint/suspicious/noConsole: Error logging needed here
					console.error('Failed to send error screenshot:', telegramError)
				}
				// Re-throw the original error
				throw error
			}
		} else {
			// Not a timeout error, just re-throw
			throw error
		}
	}

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
