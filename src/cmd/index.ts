import { Command } from 'commander'

import { run } from './run.ts'

export const program = new Command('monitor')
	.version(Bun.env.VERSION ?? '0.0.0', '--version')
	.addCommand(run, { isDefault: true })
	.helpCommand(false)
