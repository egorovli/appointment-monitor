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

interface RunOptions {
	headless: boolean
}

run.action(async function run(options: RunOptions): Promise<void> {
	await using captchaSolver = new captcha.Solver({
		path: path.resolve(import.meta.dirname, '../../../../assets/models/captcha/model.json')
	})

	await captchaSolver.initialize()

	await using eKonsulatClient = new eKonsulat.Client({
		captcha: {
			solver: captchaSolver
		}
	})

	await eKonsulatClient.initialize()

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
