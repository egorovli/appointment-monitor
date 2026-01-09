/**
 * Auto-scrollable error window component
 * Shows last N errors with type, name, description, message, and time
 */

import type { ErrorLog, ErrorType } from '../lib/error-classifier.ts'

import { Badge } from '@inkjs/ui'
import { Box, Text } from 'ink'

import { getErrorTypeDescription, summarizeErrors } from '../lib/error-classifier.ts'

export interface ErrorWindowProps {
	errors: ErrorLog[]
	maxLines?: number
	title: string
}

function formatErrorTime(date: Date): string {
	return date.toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	})
}

function truncateMessage(message: string, maxLength: number): string {
	if (message.length <= maxLength) {
		return message
	}
	return `${message.slice(0, maxLength - 3)}...`
}

function getErrorBadgeColor(
	type: ErrorType
): 'red' | 'yellow' | 'magenta' | 'cyan' | 'blue' | 'gray' {
	switch (type) {
		case 'rate_limit_hard':
			return 'red'
		case 'rate_limit_soft':
			return 'yellow'
		case 'captcha':
			return 'magenta'
		case 'slot_unavailable':
			return 'cyan'
		case 'network':
		case 'timeout':
			return 'blue'
		default:
			return 'gray'
	}
}

export function ErrorWindow({
	errors,
	title
}: {
	errors: ErrorLog[]
	title: string
}): React.ReactNode {
	const summary = summarizeErrors(errors)
	const activeErrorTypes = Object.entries(summary)
		.filter(([_, count]) => count > 0)
		.sort((a, b) => b[1] - a[1]) // Sort by count descending

	return (
		<Box
			flexDirection='column'
			borderStyle='round'
			borderColor='red'
			paddingX={1}
			minWidth={30}
			flexBasis={0}
			flexGrow={1}
			flexShrink={1}
		>
			<Text
				bold
				color='red'
			>
				{title.toUpperCase()}
			</Text>

			<Box
				flexDirection='column'
				marginTop={1}
				gap={0}
			>
				{activeErrorTypes.length === 0 ? (
					<Text
						dimColor
						italic
					>
						Everything is running smoothly.
					</Text>
				) : (
					<Box
						flexDirection='column'
						gap={0}
					>
						{activeErrorTypes.map(([type, count]) => {
							const errorType = type as ErrorType
							const color = getErrorBadgeColor(errorType)
							return (
								<Box
									key={type}
									justifyContent='space-between'
									alignItems='center'
								>
									<Badge color={color}>{getErrorTypeDescription(errorType).toUpperCase()}</Badge>
									<Text bold>{count}</Text>
								</Box>
							)
						})}
					</Box>
				)}
			</Box>
		</Box>
	)
}
