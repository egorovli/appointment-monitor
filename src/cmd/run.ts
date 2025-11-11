import { Command } from 'commander'

import * as gui from '../lib/gui/index.tsx'

export const run = new Command('run')
	.description('Run')
	.optionsGroup('Browser options')
	.option('--headless', 'Run browser in headless mode', true)
	.option('--no-headless', 'Do not run browser in headless mode')

interface RunOptions {
	headless: boolean
}

run.action(async function run(options: RunOptions) {
	gui.render()
})
