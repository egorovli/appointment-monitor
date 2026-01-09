/**
 * Stats display component
 * Shows overall status, timing, and captcha performance
 */

import type {
	AppPhase,
	ReservationState,
	SearchState,
	StatsState
} from '../hooks/use-app-state.tsx'
import type { ErrorLog, ErrorType } from '../lib/error-classifier.ts'

import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

import { getErrorTypeDescription, summarizeErrors } from '../lib/error-classifier.ts'

export interface StatsDisplayProps {
	phase: AppPhase
	stats: StatsState
	search: SearchState
	reservation: ReservationState
}

function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`
	}
	return `${seconds}s`
}

function formatErrorCounts(errors: ErrorLog[]): string {
	const summary = summarizeErrors(errors)
	const counts = Object.entries(summary)
		.filter(([_, count]) => count > 0)
		.map(([type, count]) => {
			const desc = getErrorTypeDescription(type as ErrorType)
			return `${count} ${desc.toLowerCase()}`
		})

	if (counts.length === 0) {
		return 'none'
	}
	return counts.join(', ')
}

function formatMs(ms: number | undefined): string {
	if (!ms && ms !== 0) {
		return 'n/a'
	}
	if (ms < 1000) {
		return `${ms}ms`
	}
	return `${(ms / 1000).toFixed(2)}s`
}

export function StatsDisplay({
	phase,
	stats,
	search,
	reservation
}: StatsDisplayProps): React.ReactNode {
	const [currentTime, setCurrentTime] = useState(new Date())

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date())
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [])

	const runningTime = stats.startTime
		? formatDuration(currentTime.getTime() - stats.startTime.getTime())
		: '0s'

	const totalRequests = search.attempts + reservation.attempts
	const totalErrors = search.errors.length + reservation.errors.length
	const totalSlots = search.slots.length

	const captchaSuccesses = stats.captchaSuccesses
	const captchaAttempts = stats.captchaAttempts
	const captchaFailures = stats.captchaFailures
	const captchaRate =
		captchaAttempts > 0 ? ((captchaSuccesses / captchaAttempts) * 100).toFixed(1) : '0.0'
	const averageSolve =
		captchaSuccesses > 0 ? stats.captchaTotalDurationMs / captchaSuccesses : undefined

	const statusColor = phase === 'success' ? 'green' : phase === 'booking' ? 'magenta' : 'cyan'
	const statusLabel =
		phase === 'booking'
			? 'Booking'
			: phase === 'searching'
				? 'Searching'
				: phase === 'success'
					? 'Success'
					: 'Waiting'

	return (
		<Box
			flexDirection='column'
			gap={1}
		>
			<Box gap={3}>
				<Text>
					<Text dimColor>Status:</Text> <Text color={statusColor}>{statusLabel}</Text>
				</Text>
				<Text>
					<Text dimColor>Time:</Text> <Text color='cyan'>{runningTime}</Text>
				</Text>
				<Text>
					<Text dimColor>Requests:</Text> <Text color='cyan'>{totalRequests}</Text>
				</Text>
				<Text>
					<Text dimColor>Slots seen:</Text>{' '}
					<Text color={totalSlots > 0 ? 'green' : 'yellow'}>{totalSlots}</Text>
				</Text>
				<Text>
					<Text dimColor>Errors:</Text>{' '}
					<Text color={totalErrors > 0 ? 'yellow' : 'green'}>{totalErrors}</Text>
				</Text>
			</Box>
			<Box gap={3}>
				<Text>
					<Text dimColor>CAPTCHA:</Text>{' '}
					<Text color='cyan'>
						{captchaSuccesses}/{captchaAttempts}
					</Text>{' '}
					<Text dimColor>(fail {captchaFailures})</Text>
				</Text>
				<Text>
					<Text dimColor>Success rate:</Text> <Text color='cyan'>{captchaRate}%</Text>
				</Text>
				<Text>
					<Text dimColor>Avg solve:</Text> <Text color='cyan'>{formatMs(averageSolve)}</Text>
				</Text>
				<Text>
					<Text dimColor>Last solve:</Text>{' '}
					<Text color='cyan'>{formatMs(stats.lastCaptchaDurationMs)}</Text>
				</Text>
			</Box>
			{totalErrors > 0 && (
				<Text dimColor>Types: {formatErrorCounts([...search.errors, ...reservation.errors])}</Text>
			)}
		</Box>
	)
}
