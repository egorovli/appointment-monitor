import { Box, Text, useFocus, useInput } from 'ink'
import { useState } from 'react'

export interface ServiceSelectionProps {
	onSelect: () => void
}

export function ServiceSelection({ onSelect }: ServiceSelectionProps) {
	const { isFocused } = useFocus({ autoFocus: true })
	const [selected, setSelected] = useState(false)

	useInput((input, key) => {
		if (!isFocused) {
			return
		}

		if (key.return || input === ' ') {
			setSelected(true)
			onSelect()
		}
	})

	return (
		<Box
			flexDirection='column'
			paddingX={1}
		>
			<Text bold>Select Service:</Text>
			<Box
				marginTop={1}
				marginLeft={2}
			>
				<Text color={isFocused ? 'cyan' : 'white'}>
					{isFocused ? '→ ' : '  '}
					{selected ? '✓ ' : ''}poznan.uw.gov.pl
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Press Enter or Space to continue</Text>
			</Box>
		</Box>
	)
}
