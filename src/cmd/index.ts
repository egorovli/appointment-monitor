import { Command } from 'commander'

import { run } from './run.ts'
import { watch } from './watch.ts'

export const program = new Command()
	.version(Bun.env.VERSION ?? '0.0.0', '--version')
	.addCommand(run, { isDefault: true })
	.addCommand(watch)
	.helpCommand(false)
