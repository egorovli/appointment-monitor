/**
 * Stats display component
 * Shows minimal stats: requests, errors, running time, captcha stats
 */

import type { StatsState } from '../hooks/use-app-state.ts'
import type { ErrorType } from '../lib/error-classifier.ts'

import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

import { getErrorTypeDescription, summarizeErrors } from '../lib/error-classifier.ts'
import type { ErrorLog } from '../lib/error-classifier.ts'

export interface StatsDisplayProps {
	stats: StatsState
	searchErrors: ErrorLog[]
	reservationErrors: ErrorLog[]
	searchAttempts: number
	reservationAttempts: number
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

export function StatsDisplay({
	stats,
	searchErrors,
	reservationErrors,
	searchAttempts,
	reservationAttempts
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

	const totalRequests = searchAttempts + reservationAttempts
	const totalErrors = searchErrors.length + reservationErrors.length
	const captchaSuccesses = stats.captchaAttempts - stats.captchaFailures
	const captchaRate =
		stats.captchaAttempts > 0
			? ((captchaSuccesses / stats.captchaAttempts) * 100).toFixed(1)
			: '0.0'

	return (
		<Box
			flexDirection='column'
			gap={0}
		>
			<Box gap={3}>
				<Text>
					<Text dimColor>Requests:</Text> <Text color='cyan'>{totalRequests}</Text>
				</Text>
				<Text>
					<Text dimColor>Errors:</Text>{' '}
					<Text color={totalErrors > 0 ? 'yellow' : 'green'}>{totalErrors}</Text>
				</Text>
				<Text>
					<Text dimColor>Time:</Text> <Text color='cyan'>{runningTime}</Text>
				</Text>
			</Box>
			<Box gap={3}>
				<Text>
					<Text dimColor>CAPTCHA:</Text>{' '}
					<Text color='cyan'>
						{captchaSuccesses}/{stats.captchaAttempts}
					</Text>
				</Text>
				<Text>
					<Text dimColor>Rate:</Text> <Text color='cyan'>{captchaRate}%</Text>
				</Text>
				{totalErrors > 0 && (
					<Text>
						<Text dimColor>Types:</Text>{' '}
						<Text dimColor>{formatErrorCounts([...searchErrors, ...reservationErrors])}</Text>
					</Text>
				)}
			</Box>
		</Box>
	)
}
