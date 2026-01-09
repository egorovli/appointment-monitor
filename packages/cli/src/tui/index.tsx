/**
 * Main TUI Application
 * Simplified architecture with React Context + hooks
 */

import type { Solver as CaptchaSolver } from '../lib/captcha/index.ts'
import type { Client as EKonsulatClient } from '../lib/e-konsulat.gov.pl/index.ts'
import type * as React from 'react'
import type { AppParams } from './hooks/use-app-state.tsx'

import { QueryClientProvider } from '@tanstack/react-query'
import * as ink from 'ink'

import * as query from '../lib/query/index.ts'

import { ParamSelector } from './components/param-selector.tsx'
import { SlotMonitor } from './components/slot-monitor.tsx'
import { SuccessDisplay } from './components/success-display.tsx'
import { AppProvider, useAppState } from './hooks/use-app-state.tsx'
import { useReservation } from './hooks/use-reservation.ts'
import { useSlotSearch } from './hooks/use-slot-search.ts'

export interface AppProps {
	eKonsulat: {
		client: EKonsulatClient
	}
	captcha: {
		solver: CaptchaSolver
	}
}

export function App(props: AppProps): React.ReactNode {
	return (
		<QueryClientProvider client={query.client}>
			<AppProvider>
				<AppContent
					client={props.eKonsulat.client}
					solver={props.captcha.solver}
				/>
			</AppProvider>
		</QueryClientProvider>
	)
}

interface AppContentProps {
	client: EKonsulatClient
	solver: CaptchaSolver
}

function AppContent({ client, solver }: AppContentProps): React.ReactNode {
	const { state, dispatch } = useAppState()

	// Handle parameter selection complete
	const handleParamsComplete = (params: AppParams) => {
		dispatch({ type: 'SET_PARAMS', params })
		dispatch({ type: 'START_SEARCH' })
	}

	// Handle exit
	const app = ink.useApp()
	ink.useInput((input, key) => {
		if (input === 'q' || (key.ctrl && input === 'c')) {
			app.exit()
		}
	})

	// Render based on phase
	if (state.phase === 'params') {
		return (
			<ParamSelector
				client={client}
				onComplete={handleParamsComplete}
			/>
		)
	}

	if (
		state.phase === 'success' &&
		state.reservation.result &&
		state.search.checkSlotsResult &&
		state.reservation.consulateDetails
	) {
		return (
			<SuccessDisplay
				result={state.reservation.result}
				checkSlotsResult={state.search.checkSlotsResult}
				consulateDetails={state.reservation.consulateDetails}
			/>
		)
	}

	// Phase: searching or booking
	return <MonitoringView client={client} />
}

interface MonitoringViewProps {
	client: EKonsulatClient
}

function MonitoringView({ client }: MonitoringViewProps): React.ReactNode {
	const { state } = useAppState()

	// Start slot search
	useSlotSearch({
		client,
		locationId: state.params?.locationId || '',
		amount: state.params?.amount || 1,
		enabled: state.phase === 'searching' || state.phase === 'booking'
	})

	// Start reservation when slots are found
	useReservation({
		client,
		enabled: state.search.slots.length > 0
	})

	// Determine current phase for UI
	const phase = state.search.slots.length > 0 ? 'booking' : 'searching'

	if (!state.params) {
		return <ink.Text color='red'>No parameters set</ink.Text>
	}

	return (
		<SlotMonitor
			params={state.params}
			search={state.search}
			reservation={state.reservation}
			phase={phase}
		/>
	)
}

export interface RenderOptions {
	eKonsulat: {
		client: EKonsulatClient
	}
	captcha: {
		solver: CaptchaSolver
	}
}

export function render(options: RenderOptions): ink.Instance {
	return ink.render(
		<App
			eKonsulat={options.eKonsulat}
			captcha={options.captcha}
		/>
	)
}
