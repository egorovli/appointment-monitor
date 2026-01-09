/**
 * Auto-scrollable error window component
 * Shows last N errors with type, name, description, message, and time
 */

import type { ErrorLog } from '../lib/error-classifier.ts'

import { Box, Text } from 'ink'

import { getErrorTypeDescription } from '../lib/error-classifier.ts'

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

export function ErrorWindow({ errors, maxLines = 3, title }: ErrorWindowProps): React.ReactNode {
	// Get last N errors (most recent first)
	const recentErrors = [...errors].reverse().slice(0, maxLines)

	return (
		<Box
			flexDirection='column'
			borderStyle='round'
			borderColor='gray'
			paddingX={1}
			minHeight={maxLines + 2}
		>
			<Text
				bold
				color='yellow'
			>
				{title}
			</Text>
			{recentErrors.length === 0 ? (
				<Text dimColor>No errors</Text>
			) : (
				recentErrors.map((error, index) => {
					const typeDesc = getErrorTypeDescription(error.type)
					const time = formatErrorTime(error.timestamp)
					const message = truncateMessage(error.message, 40)

					return (
						<Text
							key={`${error.timestamp.getTime()}-${index}`}
							wrap='truncate'
						>
							<Text color='red'>{typeDesc}</Text>
							<Text dimColor> • </Text>
							<Text>{message}</Text>
							<Text dimColor> • </Text>
							<Text dimColor>{time}</Text>
						</Text>
					)
				})
			)}
		</Box>
	)
}
