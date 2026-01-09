/**
 * Slot monitoring display component
 * Shows real-time search and booking progress with stats, errors, and logs
 */

import type {
	AppParams,
	LogEntry,
	ReservationState,
	SearchState,
	StatsState
} from '../hooks/use-app-state.tsx'

import type { ErrorLog, ErrorType } from '../lib/error-classifier.ts'

import { Spinner } from '@inkjs/ui'
import { Box, Text } from 'ink'
import { format, isValid, parseISO } from 'date-fns'

import { getErrorTypeDescription, summarizeErrors } from '../lib/error-classifier.ts'
import { ErrorWindow } from './error-window.tsx'
import { LogWindow } from './log-window.tsx'
import { StatsDisplay } from './stats-display.tsx'

export interface SlotMonitorProps {
	params: AppParams
	search: SearchState
	reservation: ReservationState
	stats: StatsState
	phase: 'searching' | 'booking'
	logs: LogEntry[]
}

function formatTime(date: Date | undefined): string {
	if (!date) {
		return '--:--:--'
	}
	return date.toLocaleTimeString('en-US', { hour12: false })
}

function formatDateLabel(date: string): string {
	const parsed = parseISO(date)
	if (isValid(parsed)) {
		return format(parsed, 'EEE, MMM dd')
	}
	return date
}

function formatErrorBreakdown(errors: ErrorLog[]): string[] {
	const summary = summarizeErrors(errors)
	return Object.entries(summary)
		.filter(([_, count]) => count > 0)
		.map(([type, count]) => `${count} ${getErrorTypeDescription(type as ErrorType).toLowerCase()}`)
}

const Divider = ({ color, dimColor }: { color?: string; dimColor?: boolean }) => (
	<Box
		borderStyle='single'
		borderTop={true}
		borderBottom={false}
		borderLeft={false}
		borderRight={false}
		borderColor={color}
		dimColor={dimColor}
	/>
)

export function SlotMonitor({
	params,
	search,
	reservation,
	stats,
	phase,
	logs
}: SlotMonitorProps): React.ReactNode {
	const searchErrorBreakdown = formatErrorBreakdown(search.errors)
	const reservationErrorBreakdown = formatErrorBreakdown(reservation.errors)
	const allErrors: ErrorLog[] = [...search.errors, ...reservation.errors]

	const slotDates = search.slots
		.map(s => s.date)
		.filter((d): d is string => Boolean(d))
		.map(formatDateLabel)

	const visibleDates = slotDates.slice(0, 3)
	const remainingDates = Math.max(slotDates.length - visibleDates.length, 0)

	const hasReservationSection =
		reservation.isRunning ||
		reservation.attempts > 0 ||
		reservation.errors.length > 0 ||
		search.slots.length > 0

	const showErrors = allErrors.length > 0
	const showLogs = logs.length > 0

	return (
		<Box
			flexDirection='column'
			gap={1}
		>
			<Box flexDirection='column'>
				<Text bold>Monitoring: {params.consulateName}</Text>
				<Text dimColor>
					Service: {params.serviceName} | Location: {params.locationName}
				</Text>
				<Text dimColor>People: {params.amount}</Text>
			</Box>

			<StatsDisplay
				phase={phase}
				stats={stats}
				search={search}
				reservation={reservation}
			/>

			<Divider dimColor />

			<Box
				flexDirection='column'
				gap={1}
			>
				<Box alignItems='center'>
					<Text bold>SLOT SEARCH </Text>
					{search.isRunning ? <Spinner /> : <Text color='yellow'>Paused</Text>}
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
				{searchErrorBreakdown.length > 0 && (
					<Text dimColor>Errors: {searchErrorBreakdown.join(' | ')}</Text>
				)}
				{visibleDates.length > 0 && (
					<Box
						flexDirection='column'
						marginTop={1}
						gap={0}
					>
						<Text
							color='green'
							bold
						>
							Available dates:
						</Text>
						{visibleDates.map(date => (
							<Text
								key={date}
								color='green'
							>
								- {date}
							</Text>
						))}
						{remainingDates > 0 && <Text dimColor>... and {remainingDates} more</Text>}
					</Box>
				)}
			</Box>

			{hasReservationSection && (
				<>
					<Divider dimColor />
					<Box
						flexDirection='column'
						gap={1}
					>
						<Box alignItems='center'>
							<Text bold>RESERVATION </Text>
							{reservation.isRunning && <Spinner />}
							{!reservation.isRunning && search.slots.length === 0 && (
								<Text color='yellow'>Waiting for slots...</Text>
							)}
							{!reservation.isRunning && search.slots.length > 0 && phase === 'searching' && (
								<Text color='cyan'>Ready</Text>
							)}
							{reservation.result && <Text color='green'>Completed</Text>}
						</Box>
						<Box gap={2}>
							<Text>
								Attempts: <Text color='cyan'>{reservation.attempts}</Text>
							</Text>
							<Text>
								Current slot:{' '}
								<Text color='cyan'>
									{search.slots.length === 0
										? '--'
										: `${reservation.currentSlotIndex + 1}/${search.slots.length}`}
								</Text>
							</Text>
						</Box>
						{reservationErrorBreakdown.length > 0 && (
							<Text dimColor>Errors: {reservationErrorBreakdown.join(' | ')}</Text>
						)}
					</Box>
				</>
			)}

			{showErrors && (
				<>
					<Divider dimColor />
					<ErrorWindow
						errors={allErrors}
						maxLines={5}
						title='Recent errors'
					/>
				</>
			)}

			{showLogs && (
				<>
					<Divider dimColor />
					<LogWindow
						logs={logs}
						maxLines={10}
					/>
				</>
			)}

			<Text dimColor>Press Ctrl+C to stop</Text>
		</Box>
	)
}
