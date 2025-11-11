import { Box, Text } from 'ink'

export function ErrorDisplay({
	error,
	title = 'Error'
}: {
	error: Error | unknown
	title?: string
}) {
	const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error')

	return (
		<Box
			flexDirection='column'
			paddingX={1}
		>
			<Text
				color='red'
				bold
			>
				{title}:
			</Text>
			<Text color='red'>{errorMessage}</Text>
		</Box>
	)
}
