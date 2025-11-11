import * as ink from 'ink'
import { QueryClientProvider } from '@tanstack/react-query'

import { client } from './lib/query/index.ts'
import { Counter } from './components/counter.tsx'

function App(): React.ReactNode {
	return (
		<QueryClientProvider client={client}>
			<Counter />
		</QueryClientProvider>
	)
}

export function render() {
	ink.render(<App />)
}
