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

import type { ErrorLog } from '../lib/error-classifier.ts'

import { ProgressBar, Spinner, StatusMessage } from '@inkjs/ui'
import { Box, Text } from 'ink'
import { format, isValid, parseISO } from 'date-fns'

import { ErrorDetails, ErrorWindow } from './error-window.tsx'
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

export function SlotMonitor({
	params,
	search,
	reservation,
	stats,
	phase,
	logs
}: SlotMonitorProps): React.ReactNode {
	const allErrors: ErrorLog[] = [...search.errors, ...reservation.errors]

	const slotDates = search.slots
		.map(s => s.date)
		.filter((d): d is string => Boolean(d))
		.map(formatDateLabel)

	const visibleDates = slotDates.slice(0, 5)
	const remainingDates = Math.max(slotDates.length - visibleDates.length, 0)

	const showReservation =
		reservation.isRunning ||
		reservation.attempts > 0 ||
		reservation.errors.length > 0 ||
		search.slots.length > 0

	const showErrors = allErrors.length > 0
	const showLogs = logs.length > 0

	// Get most recent critical log for status message
	const lastCriticalLog = [...logs]
		.reverse()
		.find(l => l.level === 'error' || l.message.includes('Success') || l.message.includes('found'))

	const totalSlots = search.slots.length
	const reservationProgress =
		totalSlots > 0 ? ((reservation.currentSlotIndex + 1) / totalSlots) * 100 : 0

	return (
		<Box
			flexDirection='column'
			padding={1}
			gap={1}
		>
			{/* Status Message Header */}
			{lastCriticalLog && (
				<StatusMessage variant={lastCriticalLog.level === 'error' ? 'error' : 'success'}>
					{lastCriticalLog.message}
				</StatusMessage>
			)}

			{/* Header Section */}
			<Box
				flexDirection='column'
				borderStyle='round'
				borderColor='blue'
				paddingX={1}
			>
				<Box justifyContent='space-between'>
					<Text
						bold
						color='blue'
					>
						MONITORING: {params.consulateName.toUpperCase()}
					</Text>
					<Text dimColor>Press Ctrl+C to stop</Text>
				</Box>
				<Box gap={2}>
					<Text dimColor>
						Service: <Text color='white'>{params.serviceName}</Text>
					</Text>
					<Text dimColor>
						Location: <Text color='white'>{params.locationName}</Text>
					</Text>
					<Text dimColor>
						People: <Text color='white'>{params.amount}</Text>
					</Text>
				</Box>
			</Box>

			{/* Main Stats Grid */}
			<StatsDisplay
				phase={phase}
				stats={stats}
				search={search}
				reservation={reservation}
			/>

			<Box
				flexDirection='row'
				gap={1}
				flexWrap='wrap'
			>
				{/* Slot Search Section */}
				<Box
					flexDirection='column'
					borderStyle='round'
					borderColor={search.isRunning ? 'green' : 'yellow'}
					paddingX={1}
					minWidth={30}
					flexGrow={1}
				>
					<Box justifyContent='space-between'>
						<Text bold>SLOT SEARCH</Text>
						{search.isRunning ? <Spinner label='SEARCHING' /> : <Text color='yellow'>PAUSED</Text>}
					</Box>
					<Box
						flexDirection='column'
						marginTop={1}
					>
						<Box justifyContent='space-between'>
							<Text dimColor>Attempts:</Text>
							<Text color='cyan'>{search.attempts}</Text>
						</Box>
						<Box justifyContent='space-between'>
							<Text dimColor>Last Attempt:</Text>
							<Text color='cyan'>{formatTime(search.lastAttempt)}</Text>
						</Box>
						<Box justifyContent='space-between'>
							<Text dimColor>Available Slots:</Text>
							<Text color={search.slots.length > 0 ? 'green' : 'yellow'}>
								{search.slots.length}
							</Text>
						</Box>

						{visibleDates.length > 0 && (
							<Box
								flexDirection='column'
								marginTop={1}
								borderStyle='single'
								borderTop={true}
								borderBottom={false}
								borderLeft={false}
								borderRight={false}
								borderColor='green'
								paddingTop={1}
							>
								<Text
									color='green'
									bold
								>
									AVAILABLE DATES:
								</Text>
								{visibleDates.map(date => (
									<Text
										key={date}
										color='green'
									>
										• {date}
									</Text>
								))}
								{remainingDates > 0 && (
									<Text
										dimColor
										italic
									>
										+ {remainingDates} more...
									</Text>
								)}
							</Box>
						)}
					</Box>
				</Box>

				{/* Reservation Section (Conditional) */}
				{showReservation && (
					<Box
						flexDirection='column'
						borderStyle='round'
						borderColor={reservation.isRunning ? 'magenta' : 'gray'}
						paddingX={1}
						minWidth={30}
						flexGrow={1}
					>
						<Box justifyContent='space-between'>
							<Text bold>RESERVATION</Text>
							{reservation.isRunning && <Spinner label='BOOKING' />}
						</Box>
						<Box
							flexDirection='column'
							marginTop={1}
						>
							<Box justifyContent='space-between'>
								<Text dimColor>Attempts:</Text>
								<Text color='cyan'>{reservation.attempts}</Text>
							</Box>
							<Box justifyContent='space-between'>
								<Text dimColor>Current Slot:</Text>
								<Text color='cyan'>
									{search.slots.length === 0
										? '--'
										: `${reservation.currentSlotIndex + 1} / ${search.slots.length}`}
								</Text>
							</Box>

							{reservation.isRunning && totalSlots > 0 && (
								<Box
									marginTop={1}
									flexDirection='column'
									gap={0}
								>
									<Text dimColor>Progress:</Text>
									<ProgressBar value={reservationProgress} />
								</Box>
							)}

							<Box
								justifyContent='space-between'
								marginTop={1}
							>
								<Text dimColor>Status:</Text>
								{reservation.result ? (
									<Text color='green'>COMPLETED</Text>
								) : reservation.isRunning ? (
									<Text color='magenta'>BOOKING...</Text>
								) : search.slots.length > 0 ? (
									<Text color='cyan'>READY</Text>
								) : (
									<Text color='yellow'>WAITING FOR SLOTS</Text>
								)}
							</Box>
						</Box>
					</Box>
				)}
			</Box>

			{/* Logs Section (Conditional) */}
			{showLogs && (
				<LogWindow
					logs={logs}
					maxLines={10}
				/>
			)}
		</Box>
	)
}
