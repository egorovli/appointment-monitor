import { Box, Text } from 'ink'

export function Header() {
	return (
		<Box
			borderStyle='round'
			borderColor='cyan'
			paddingX={1}
			marginBottom={1}
			flexDirection='column'
		>
			<Text
				bold
				color='cyan'
			>
				Appointment Monitor - poznan.uw.gov.pl
			</Text>
			<Text dimColor>Book your appointment online</Text>
		</Box>
	)
}
