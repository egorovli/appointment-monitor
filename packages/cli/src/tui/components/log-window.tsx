import type { LogEntry } from '../hooks/use-app-state.tsx'

import { StatusMessage } from '@inkjs/ui'
import { Box, Text } from 'ink'

export interface LogWindowProps {
	logs: LogEntry[]
	maxLines?: number
}

function formatLogTime(date: Date): string {
	return date.toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	})
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text
	}
	return `${text.slice(0, maxLength - 3)}...`
}

function getStatusVariant(level: LogEntry['level']): 'info' | 'warning' | 'error' | 'success' {
	switch (level) {
		case 'warn':
			return 'warning'
		case 'error':
			return 'error'
		default:
			return 'info'
	}
}

export function LogWindow({ logs, maxLines = 10 }: LogWindowProps): React.ReactNode {
	const recentLogs = [...logs].slice(-maxLines).reverse()

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
				color='cyan'
			>
				ACTIVITY LOG
			</Text>

			{recentLogs.length === 0 ? (
				<Text
					dimColor
					italic
				>
					Waiting for activity...
				</Text>
			) : (
				recentLogs.map((log, index) => {
					// Check if message looks like a success message
					const variant =
						log.message.toLowerCase().includes('success') ||
						log.message.toLowerCase().includes('solved') ||
						log.message.toLowerCase().includes('found')
							? 'success'
							: getStatusVariant(log.level)

					return (
						<Box key={`${log.timestamp.getTime()}-${index}`}>
							<StatusMessage variant={variant}>
								{variant === 'error' && <Text dimColor> </Text>}
								<Text dimColor>[{formatLogTime(log.timestamp)}]</Text>
								<Text dimColor> </Text>
								<Text>{truncate(log.message, 120)}</Text>
							</StatusMessage>
						</Box>
					)
				})
			)}
		</Box>
	)
}
