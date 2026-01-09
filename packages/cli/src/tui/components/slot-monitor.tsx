/**
 * Slot monitoring display component
 * Shows real-time search and booking progress
 */

import type {
	AppParams,
	ReservationState,
	SearchState,
	StatsState
} from '../hooks/use-app-state.ts'
import type { ErrorType } from '../lib/error-classifier.ts'

import { Spinner } from '@inkjs/ui'
import { Box, Text } from 'ink'

import { getErrorTypeDescription, summarizeErrors } from '../lib/error-classifier.ts'

import { ErrorWindow } from './error-window.tsx'
import { StatsDisplay } from './stats-display.tsx'

export interface SlotMonitorProps {
	params: AppParams
	search: SearchState
	reservation: ReservationState
	stats: StatsState
	phase: 'searching' | 'booking'
}

function formatTime(date: Date | undefined): string {
	if (!date) {
		return '--:--:--'
	}
	return date.toLocaleTimeString('en-US', { hour12: false })
}

function formatErrorSummary(errors: { type: ErrorType; count: number }[]): string {
	if (errors.length === 0) {
		return 'None'
	}
	return errors
		.filter(e => e.count > 0)
		.map(e => `${e.count} ${getErrorTypeDescription(e.type).toLowerCase()}`)
		.join(', ')
}

export function SlotMonitor({
	params,
	search,
	reservation,
	stats,
	phase
}: SlotMonitorProps): React.ReactNode {
	const searchErrorSummary = summarizeErrors(search.errors)
	const reservationErrorSummary = summarizeErrors(reservation.errors)

	const searchErrors = Object.entries(searchErrorSummary)
		.filter(([_, count]) => count > 0)
		.map(([type, count]) => ({ type: type as ErrorType, count }))

	const reservationErrors = Object.entries(reservationErrorSummary)
		.filter(([_, count]) => count > 0)
		.map(([type, count]) => ({ type: type as ErrorType, count }))

	// Get available slot dates
	const slotDates = search.slots
		.map(s => s.date)
		.filter((d): d is string => !!d)
		.slice(0, 5) // Show first 5

	return (
		<Box
			flexDirection='column'
			gap={1}
		>
			{/* Header */}
			<Box flexDirection='column'>
				<Text bold>Monitoring: {params.consulateName}</Text>
				<Text dimColor>
					Service: {params.serviceName} | Location: {params.locationName}
				</Text>
				<Text dimColor>People: {params.amount}</Text>
			</Box>

			{/* Stats */}
			<StatsDisplay
				stats={stats}
				searchErrors={search.errors}
				reservationErrors={reservation.errors}
				searchAttempts={search.attempts}
				reservationAttempts={reservation.attempts}
			/>

			{/* Divider */}
			<Text>{'─'.repeat(50)}</Text>

			{/* Slot Search Status */}
			<Box flexDirection='column'>
				<Box>
					<Text bold>SLOT SEARCH </Text>
					{search.isRunning ? <Spinner /> : <Text color='yellow'>Stopped</Text>}
				</Box>
				<Box gap={2}>
					<Text>
						Attempts: <Text color='cyan'>{search.attempts}</Text>
					</Text>
					<Text>
						Last: <Text color='cyan'>{formatTime(search.lastAttempt)}</Text>
					</Text>
					<Text>
						Slots:{' '}
						<Text color={search.slots.length > 0 ? 'green' : 'yellow'}>{search.slots.length}</Text>
					</Text>
				</Box>
				{searchErrors.length > 0 && (
					<Text dimColor>Errors: {formatErrorSummary(searchErrors)}</Text>
				)}
				{slotDates.length > 0 && (
					<Box
						flexDirection='column'
						marginTop={1}
					>
						<Text
							color='green'
							bold
						>
							Available dates:
						</Text>
						{slotDates.map(date => (
							<Text
								key={date}
								color='green'
							>
								{' '}
								{date}
							</Text>
						))}
						{search.slots.length > 5 && (
							<Text dimColor> ... and {search.slots.length - 5} more</Text>
						)}
					</Box>
				)}
			</Box>

			{/* Divider */}
			<Text>{'─'.repeat(50)}</Text>

			{/* Reservation Status */}
			<Box flexDirection='column'>
				<Box>
					<Text bold>RESERVATION </Text>
					{!reservation.isRunning && search.slots.length === 0 && (
						<Text color='yellow'>Waiting for slots...</Text>
					)}
					{reservation.isRunning && <Spinner />}
					{!reservation.isRunning && search.slots.length > 0 && phase === 'searching' && (
						<Text color='cyan'>Starting...</Text>
					)}
				</Box>
				{reservation.isRunning && (
					<Box gap={2}>
						<Text>
							Attempts: <Text color='cyan'>{reservation.attempts}</Text>
						</Text>
						<Text>
							Current slot:{' '}
							<Text color='cyan'>
								{reservation.currentSlotIndex + 1}/{search.slots.length}
							</Text>
						</Text>
					</Box>
				)}
				{reservationErrors.length > 0 && (
					<Text dimColor>Errors: {formatErrorSummary(reservationErrors)}</Text>
				)}
			</Box>

			{/* Divider */}
			<Text>{'─'.repeat(50)}</Text>

			{/* Error Windows */}
			<Box
				flexDirection='row'
				gap={2}
			>
				<Box flexGrow={1}>
					<ErrorWindow
						errors={search.errors}
						maxLines={3}
						title='Search Errors'
					/>
				</Box>
				<Box flexGrow={1}>
					<ErrorWindow
						errors={reservation.errors}
						maxLines={3}
						title='Reservation Errors'
					/>
				</Box>
			</Box>

			{/* Footer */}
			<Text dimColor>Press Ctrl+C to stop</Text>
		</Box>
	)
}
