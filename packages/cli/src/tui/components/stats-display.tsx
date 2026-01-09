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
import type { TextProps } from 'ink'
import type { ComponentTheme } from '@inkjs/ui'

import { Badge, defaultTheme, extendTheme, ProgressBar, ThemeProvider } from '@inkjs/ui'
import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

import { getErrorTypeDescription, summarizeErrors } from '../lib/error-classifier.ts'
import { ErrorWindow } from './error-window.tsx'

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
	if (ms === undefined) {
		return 'n/a'
	}
	if (ms < 1000) {
		return `${Math.round(ms)}ms`
	}
	return `${(ms / 1000).toFixed(2)}s`
}

const progressBarTheme = {
	styles: {
		completed: (): TextProps => ({
			color: 'cyan'
		}),
		remaining: (): TextProps => ({
			dimColor: true
		})
	}
} satisfies ComponentTheme

const customTheme = extendTheme(defaultTheme, {
	components: {
		ProgressBar: progressBarTheme
	}
})

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
		}, 50)

		return () => {
			clearInterval(interval)
		}
	}, [])

	const runningTime = stats.startTime
		? formatDuration(currentTime.getTime() - stats.startTime.getTime())
		: '0s'

	const totalRequests = search.attempts + reservation.attempts
	const totalSlots = search.slots.length

	const captchaSuccesses = stats.captchaSuccesses
	const captchaAttempts = stats.captchaAttempts
	const captchaFailures = stats.captchaFailures
	const captchaRate =
		captchaAttempts > 0 ? ((captchaSuccesses / captchaAttempts) * 100).toFixed(1) : '0.0'
	const averageSolve =
		captchaSuccesses > 0 ? stats.captchaTotalDurationMs / captchaSuccesses : undefined

	const getPhaseBadgeProps = (
		phase: AppPhase
	): { color: 'green' | 'magenta' | 'cyan' | 'blue'; label: string } => {
		switch (phase) {
			case 'success':
				return { color: 'green', label: 'SUCCESS' }
			case 'booking':
				return { color: 'magenta', label: 'BOOKING' }
			case 'searching':
				return { color: 'cyan', label: 'SEARCHING' }
			default:
				return { color: 'blue', label: 'WAITING' }
		}
	}

	const phaseBadge = getPhaseBadgeProps(phase)

	const searchCooldownLeft =
		search.nextAttemptAt && search.nextAttemptAt > currentTime
			? Math.max(0, search.nextAttemptAt.getTime() - currentTime.getTime())
			: 0

	const reservationCooldownLeft =
		reservation.nextAttemptAt && reservation.nextAttemptAt > currentTime
			? Math.max(0, reservation.nextAttemptAt.getTime() - currentTime.getTime())
			: 0

	const activeCooldownLeft = Math.max(searchCooldownLeft, reservationCooldownLeft)
	const activeCooldownDuration =
		activeCooldownLeft > 0
			? (searchCooldownLeft > reservationCooldownLeft
					? search.cooldownDurationMs
					: reservation.cooldownDurationMs) || 0
			: 0

	const cooldownProgress =
		activeCooldownDuration > 0
			? Math.min((activeCooldownLeft / activeCooldownDuration) * 100, 100)
			: 0

	return (
		<Box
			flexDirection='row'
			gap={1}
			flexWrap='wrap'
		>
			<Box
				flexDirection='column'
				borderStyle='round'
				borderColor='cyan'
				paddingX={1}
				minWidth={30}
				// flexShrink={0}
				// flexBasis={1}
				flexBasis={0}
				flexGrow={1}
				flexShrink={1}
			>
				<Box
					justifyContent='space-between'
					alignItems='center'
				>
					<Text bold>STATUS</Text>
					<Badge color={phaseBadge.color}>{phaseBadge.label}</Badge>
				</Box>
				<Box
					flexDirection='column'
					marginTop={1}
				>
					<Box justifyContent='space-between'>
						<Text dimColor>Running Time:</Text>
						<Text color='cyan'>{runningTime}</Text>
					</Box>
					<Box justifyContent='space-between'>
						<Text dimColor>Total Requests:</Text>
						<Text color='cyan'>{totalRequests}</Text>
					</Box>
					<Box justifyContent='space-between'>
						<Text dimColor>Slots Found:</Text>
						<Text color={totalSlots > 0 ? 'green' : 'yellow'}>{totalSlots}</Text>
					</Box>

					<Box
						flexDirection='column'
						marginTop={1}
						gap={0}
					>
						<Box justifyContent='space-between'>
							<Text dimColor>Cooldown:</Text>
							{activeCooldownLeft > 0 ? (
								<Text color='yellow'>{(activeCooldownLeft / 1000).toFixed(1)}s</Text>
							) : (
								<Text color='grey'>N/A</Text>
							)}
						</Box>
						<ThemeProvider theme={customTheme}>
							<ProgressBar value={cooldownProgress} />
						</ThemeProvider>
					</Box>
				</Box>
			</Box>

			<Box
				flexDirection='column'
				borderStyle='round'
				borderColor='magenta'
				paddingX={1}
				minWidth={30}
				flexBasis={0}
				flexGrow={1}
				flexShrink={1}
			>
				<Text bold>CAPTCHA STATS</Text>
				<Box
					flexDirection='column'
					marginTop={1}
				>
					<Box justifyContent='space-between'>
						<Text dimColor>Attempts:</Text>
						<Text color='cyan'>{captchaAttempts}</Text>
					</Box>
					<Box justifyContent='space-between'>
						<Text dimColor>Solved:</Text>
						<Text color='green'>{captchaSuccesses}</Text>
					</Box>
					<Box justifyContent='space-between'>
						<Text dimColor>Success Rate:</Text>
						<Text color='cyan'>{captchaRate}%</Text>
					</Box>
					<Box justifyContent='space-between'>
						<Text dimColor>Avg Solve:</Text>
						<Text color='cyan'>{formatMs(averageSolve)}</Text>
					</Box>
					<Box justifyContent='space-between'>
						<Text dimColor>Last Solve:</Text>
						<Text color='cyan'>{formatMs(stats.lastCaptchaDurationMs)}</Text>
					</Box>
				</Box>
			</Box>

			<ErrorWindow
				errors={[...search.errors, ...reservation.errors]}
				title='Error Stats'
			/>
		</Box>
	)
}
