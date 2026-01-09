import { Command } from 'commander'

import * as path from 'node:path'

import * as captcha from '../lib/captcha/index.ts'
import * as eKonsulat from '../lib/e-konsulat.gov.pl/index.ts'
import * as tui from '../tui/index.tsx'

export const run = new Command('run')
	.description('Run')
	.optionsGroup('Browser options')
	.option('--headless', 'Run browser in headless mode', true)
	.option('--no-headless', 'Do not run browser in headless mode')
	.optionsGroup('Simulation options')
	.option('--dry-run', 'Enable simulation mode (no actual API requests)', false)
	.option(
		'--simulation-slot-search-success-rate <rate>',
		'Success rate for slot search simulation (e.g., "3.75%")',
		'3.75%'
	)
	.option(
		'--simulation-slot-reservation-success-rate <rate>',
		'Success rate for slot reservation simulation (e.g., "75%")',
		'75%'
	)

interface RunOptions {
	headless: boolean
	dryRun?: boolean
	simulationSlotSearchSuccessRate?: string
	simulationSlotReservationSuccessRate?: string
}

/**
 * Parse percentage string to number (0-1)
 * Examples: "3.75%" -> 0.0375, "75%" -> 0.75, "100%" -> 1.0
 */
function parsePercentage(value: string): number {
	const cleaned = value.trim().replace(/%$/, '')
	const parsed = Number.parseFloat(cleaned)
	if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
		throw new Error(`Invalid percentage: ${value}. Must be between 0% and 100%`)
	}
	return parsed / 100
}

run.action(async function run(options: RunOptions): Promise<void> {
	await using captchaSolver = new captcha.Solver({
		path: path.resolve(import.meta.dirname, '../../../../assets/models/captcha/model.json')
	})

	await captchaSolver.initialize()

	await using realClient = new eKonsulat.Client({
		captcha: {
			solver: captchaSolver
		}
	})

	await realClient.initialize()

	// Create simulation client if dry-run is enabled
	const eKonsulatClient: eKonsulat.EKonsulatClient = options.dryRun
		? new eKonsulat.SimulationClient(realClient, {
				slotSearchSuccessRate: parsePercentage(options.simulationSlotSearchSuccessRate ?? '3.75%'),
				slotReservationSuccessRate: parsePercentage(
					options.simulationSlotReservationSuccessRate ?? '75%'
				)
			})
		: realClient

	const app = tui.render({
		eKonsulat: {
			client: eKonsulatClient
		},

		captcha: {
			solver: captchaSolver
		}
	})

	await app.waitUntilExit()
})
