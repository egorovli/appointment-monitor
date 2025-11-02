import { Command } from 'commander'
import ora from 'ora'
import { PlaywrightBrowserManager } from '../lib/browser-manager.ts'
import { checkAvailableSlots } from '../lib/slot-checker.ts'
import { hasAvailableDays, getTotalAvailableDays } from '../lib/utils.ts'
import type { GetAvailableDaysOptions } from '../lib/types.ts'

export const run = new Command('run')
	.description('Check slot availability once')
	.option(
		'-o, --operation <text>',
		'Operation text to check (e.g., "Obywatelstwo polskie")',
		'Obywatelstwo polskie'
	)
	.option('--visible', 'Run browser in visible mode (default: headless)')
	.option('--api-timeout <ms>', 'API timeout in milliseconds', '30000')
	.option('--operation-delay <ms>', 'Delay after clicking operation button in milliseconds', '500')
	.option('--next-delay <ms>', 'Delay after clicking Next button in milliseconds', '0')

run.action(async function runAction() {
	const options = this.opts()

	const operationText = options.operation
	const headless = options.visible !== true
	const apiTimeout = Number.parseInt(options.apiTimeout, 10)
	const operationDelay = Number.parseInt(options.operationDelay, 10)
	const nextDelay = Number.parseInt(options.nextDelay, 10)

	const browserManager = new PlaywrightBrowserManager(headless)
	const initSpinner = ora('Initializing browser').start()

	try {
		await browserManager.initialize()
		initSpinner.succeed('Browser initialized')

		const checkSpinner = ora('Checking slots...').start()

		const checkOptions: GetAvailableDaysOptions = {
			operationText,
			headless,
			apiTimeout,
			operationClickDelay: operationDelay,
			nextButtonClickDelay: nextDelay
		}

		try {
			const result = await checkAvailableSlots(browserManager, checkOptions)

			const hasAvailable = hasAvailableDays(result)
			const totalAvailable = getTotalAvailableDays(result)

			if (hasAvailable) {
				checkSpinner.succeed(`Available slots found! (${totalAvailable} days)`)
			} else {
				checkSpinner.info(`No available slots (${totalAvailable} days)`)
			}
		} catch (error) {
			checkSpinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`)
			process.exit(1)
		} finally {
			await browserManager.close()
		}
	} catch (error) {
		initSpinner.fail(
			`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`
		)
		await browserManager.close()
		process.exit(1)
	}
})
