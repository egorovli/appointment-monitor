import type { AppointmentSlot, Operation } from '../poznan.uw.gov.pl/index.ts'
import type { Client } from '../poznan.uw.gov.pl/index.ts'

import * as ink from 'ink'
import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { useApp, useInput } from 'ink'

import * as query from './lib/query/index.ts'
import { ClientProvider } from './lib/client-context.tsx'
import { AppointmentSummary } from './components/appointment-summary.tsx'
import { DateSelection } from './components/date-selection.tsx'
import { Header } from './components/header.tsx'
import { OperationSelection } from './components/operation-selection.tsx'
import { ServiceSelection } from './components/service-selection.tsx'
import { SlotSelection } from './components/slot-selection.tsx'
import { StatusBar } from './components/status-bar.tsx'

type NavigationState =
	| { type: 'service' }
	| { type: 'operation' }
	| { type: 'date'; operation: Operation }
	| { type: 'slot'; operation: Operation; date: string }
	| { type: 'summary'; operation: Operation; date: string; slot: AppointmentSlot }
	| { type: 'completed' }

export interface AppProps {
	client: Client
}

function App({ client }: AppProps): React.ReactNode {
	const { exit } = useApp()
	const [state, setState] = useState<NavigationState>({ type: 'service' })

	useInput((input, key) => {
		if ((input === 'q' || input === 'Q') && state.type !== 'completed') {
			exit()
		}
		if (key.escape) {
			if (state.type === 'service') {
				exit()
			} else {
				setState({ type: 'service' })
			}
		}
	})

	const handleServiceSelect = () => {
		setState({ type: 'operation' })
	}

	const handleOperationSelect = (operation: Operation) => {
		setState({ type: 'date', operation })
	}

	const handleDateSelect = (date: string) => {
		if (state.type === 'date') {
			setState({ type: 'slot', operation: state.operation, date })
		}
	}

	const handleSlotSelect = (slot: AppointmentSlot) => {
		if (state.type === 'slot') {
			setState({
				type: 'summary',
				operation: state.operation,
				date: state.date,
				slot
			})
		}
	}

	const handleBack = () => {
		if (state.type === 'date') {
			setState({ type: 'operation' })
		} else if (state.type === 'slot') {
			setState({ type: 'date', operation: state.operation })
		} else if (state.type === 'summary') {
			setState({ type: 'slot', operation: state.operation, date: state.date })
		}
	}

	const handleConfirm = () => {
		if (state.type === 'summary') {
			// TODO: Implement actual appointment booking
			setState({ type: 'completed' })
		}
	}

	const handleCancel = () => {
		if (state.type === 'summary') {
			setState({ type: 'slot', operation: state.operation, date: state.date })
		}
	}

	return (
		<QueryClientProvider client={query.client}>
			<ClientProvider client={client}>
				<ink.Box
					flexDirection='column'
					paddingX={1}
				>
					<Header />
					{state.type === 'service' && <ServiceSelection onSelect={handleServiceSelect} />}
					{state.type === 'operation' && <OperationSelection onSelect={handleOperationSelect} />}
					{state.type === 'date' && (
						<DateSelection
							operationId={state.operation.id}
							onSelect={handleDateSelect}
							onBack={handleBack}
						/>
					)}
					{state.type === 'slot' && (
						<SlotSelection
							operationId={state.operation.id}
							date={state.date}
							onSelect={handleSlotSelect}
							onBack={handleBack}
						/>
					)}
					{state.type === 'summary' && (
						<AppointmentSummary
							operation={state.operation}
							date={state.date}
							slot={state.slot}
							onConfirm={handleConfirm}
							onCancel={handleCancel}
						/>
					)}
					{state.type === 'completed' && (
						<ink.Box flexDirection='column'>
							<ink.Text
								color='green'
								bold
							>
								✓ Appointment confirmed!
							</ink.Text>
							<ink.Box marginTop={1}>
								<ink.Text dimColor>Press Ctrl+C or 'q' to exit</ink.Text>
							</ink.Box>
						</ink.Box>
					)}
					{state.type !== 'completed' && (
						<ink.Box
							marginTop={1}
							paddingTop={1}
							borderTop={true}
						>
							<ink.Text dimColor>
								Press 'q' to quit | ESC to go back/exit | 'r' to reload browser
							</ink.Text>
						</ink.Box>
					)}
					<StatusBar />
				</ink.Box>
			</ClientProvider>
		</QueryClientProvider>
	)
}

export interface RenderOptions {
	client: Client
}

export function render(options: RenderOptions) {
	ink.render(<App client={options.client} />)
}
