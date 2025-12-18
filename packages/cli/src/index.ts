import 'temporal-polyfill/global'

import { program } from './cmd/index.ts'

program.parse(process.argv)
