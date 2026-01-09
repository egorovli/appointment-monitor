import type { LogEntry } from '../hooks/use-app-state.tsx'

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

function levelColor(level: LogEntry['level']): string {
	switch (level) {
		case 'warn':
			return 'yellow'
		case 'error':
			return 'red'
		default:
			return 'cyan'
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
				Activity
			</Text>
			{recentLogs.length === 0 ? (
				<Text dimColor>No activity yet</Text>
			) : (
				recentLogs.map((log, index) => (
					<Text
						key={`${log.timestamp.getTime()}-${index}`}
						wrap='truncate'
					>
						<Text color={levelColor(log.level)}>{log.level.toUpperCase()}</Text>
						<Text dimColor> - </Text>
						<Text>{truncate(log.message, 90)}</Text>
						<Text dimColor> - {formatLogTime(log.timestamp)}</Text>
					</Text>
				))
			)}
		</Box>
	)
}
