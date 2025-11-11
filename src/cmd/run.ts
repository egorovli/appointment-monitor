import { Command } from 'commander'

import * as gui from '../lib/gui/index.tsx'
import * as poznan from '../lib/poznan.uw.gov.pl/index.ts'

export const run = new Command('run')
	.description('Run')
	.optionsGroup('Browser options')
	.option('--headless', 'Run browser in headless mode', true)
	.option('--no-headless', 'Do not run browser in headless mode')

interface RunOptions {
	headless: boolean
}

run.action(async function run(options: RunOptions) {
	const client = new poznan.Client({ headless: options.headless })
	await client.initialize()

	gui.render({
		client
	})
})
