import type { GetAvailableDaysOptions } from '../lib/types.ts'

import { Command } from 'commander'
import ora from 'ora'

import { PlaywrightBrowserManager } from '../lib/browser-manager.ts'
import { checkAvailableSlots } from '../lib/slot-checker.ts'
import { sendTelegramNotification } from '../lib/telegram-notifier.ts'
import { hasAvailableDays, getTotalAvailableDays } from '../lib/utils.ts'

export const watch = new Command('watch')
	.description('Monitor slot availability (long-running process)')
	.option(
		'-o, --operation <text>',
		'Operation text to check (e.g., "Obywatelstwo polskie")',
		'Obywatelstwo polskie'
	)
	.option('-i, --interval <seconds>', 'Check interval in seconds', '60')
	.option('--visible', 'Run browser in visible mode (default: headless)')
	.option('--api-timeout <ms>', 'API timeout in milliseconds', '30000')
	.option('--operation-delay <ms>', 'Delay after clicking operation button in milliseconds', '500')
	.option('--next-delay <ms>', 'Delay after clicking Next button in milliseconds', '0')

watch.action(async function watchAction() {
	const options = this.opts()

	const operationText = options.operation
	const intervalSeconds = Number.parseInt(options.interval, 10)
	const headless = options.visible !== true
	const apiTimeout = Number.parseInt(options.apiTimeout, 10)
	const operationDelay = Number.parseInt(options.operationDelay, 10)
	const nextDelay = Number.parseInt(options.nextDelay, 10)

	if (Number.isNaN(intervalSeconds) || intervalSeconds < 1) {
		process.exit(1)
	}

	const browserManager = new PlaywrightBrowserManager(headless)
	const initSpinner = ora('Initializing browser').start()

	let isShuttingDown = false

	// Graceful shutdown handler
	const shutdown = async (signal: string) => {
		if (isShuttingDown) {
			return
		}
		isShuttingDown = true
		const shutdownSpinner = ora('Closing browser').start()

		try {
			await browserManager.close()
			shutdownSpinner.succeed('Browser closed')
			process.exit(0)
		} catch (error) {
			shutdownSpinner.fail(
				`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`
			)
			process.exit(1)
		}
	}

	process.on('SIGINT', () => shutdown('SIGINT'))
	process.on('SIGTERM', () => shutdown('SIGTERM'))

	try {
		await browserManager.initialize()
		initSpinner.succeed('Browser initialized')

		let iteration = 0

		const checkOptions: GetAvailableDaysOptions = {
			operationText,
			headless,
			apiTimeout,
			operationClickDelay: operationDelay,
			nextButtonClickDelay: nextDelay
		}

		// Continuous monitoring loop
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (isShuttingDown) {
				break
			}

			iteration++
			const checkSpinner = ora(`[${iteration}] Checking slots...`).start()

			try {
				const result = await checkAvailableSlots(browserManager, checkOptions)

				const hasAvailable = hasAvailableDays(result)
				const totalAvailable = getTotalAvailableDays(result)

				if (hasAvailable) {
					checkSpinner.succeed(`[${iteration}] Available slots found! (${totalAvailable} days)`)

					// Send Telegram notification
					const notifySpinner = ora('Sending Telegram notification...').start()
					try {
						await sendTelegramNotification({
							operationText,
							totalAvailable
						})
						notifySpinner.succeed('Telegram notification sent')
					} catch (error) {
						notifySpinner.fail(
							`Failed to send notification: ${error instanceof Error ? error.message : String(error)}`
						)
					}

					// Stop watch mode and exit
					await shutdown('slots-found')
					break
				}

				checkSpinner.info(`[${iteration}] No available slots (${totalAvailable} days)`)

				// Reset page for next iteration
				await browserManager.resetPage()
			} catch (error) {
				checkSpinner.fail(
					`[${iteration}] Error: ${error instanceof Error ? error.message : String(error)}`
				)

				// Try to reset page on error
				try {
					await browserManager.resetPage()
				} catch {
					// If reset fails, reinitialize browser
					try {
						await browserManager.close()
						const reinitSpinner = ora('Reinitializing browser...').start()
						await browserManager.initialize()
						reinitSpinner.succeed('Browser reinitialized')
					} catch (reinitError) {
						process.exit(1)
					}
				}
			}

			if (isShuttingDown) {
				break
			}

			// Wait for next interval
			await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000))
		}
	} catch (error) {
		initSpinner.fail(
			`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`
		)
		await browserManager.close()
		process.exit(1)
	}
})
