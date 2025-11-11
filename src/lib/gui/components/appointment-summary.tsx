import { Box, Text, useInput } from 'ink'

import type { AppointmentSlot, Operation } from '../../../poznan.uw.gov.pl/index.ts'

export interface AppointmentSummaryProps {
	operation: Operation
	date: string
	slot: AppointmentSlot
	onConfirm: () => void
	onCancel: () => void
}

export function AppointmentSummary({
	operation,
	date,
	slot,
	onConfirm,
	onCancel
}: AppointmentSummaryProps) {
	useInput((input, key) => {
		if (input === 'y' || (key.return && input === '')) {
			onConfirm()
		} else if (input === 'n' || input === 'b' || key.leftArrow) {
			onCancel()
		}
	})

	return (
		<Box
			flexDirection='column'
			paddingX={1}
		>
			<Text
				bold
				color='cyan'
			>
				Appointment Summary
			</Text>
			<Box
				flexDirection='column'
				marginTop={1}
				marginLeft={2}
			>
				<Box>
					<Text>Service: </Text>
					<Text color='green'>poznan.uw.gov.pl</Text>
				</Box>
				<Box marginTop={1}>
					<Text>Operation: </Text>
					<Text color='green'>{operation.name}</Text>
				</Box>
				<Box marginTop={1}>
					<Text>Date: </Text>
					<Text color='green'>{date}</Text>
				</Box>
				<Box marginTop={1}>
					<Text>Time: </Text>
					<Text color='green'>{slot.time}</Text>
				</Box>
			</Box>
			<Box
				marginTop={2}
				borderStyle='round'
				borderColor='cyan'
				padding={1}
			>
				<Text>Confirm this appointment?</Text>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Press 'y' or Enter to confirm | 'n' or ← to cancel</Text>
			</Box>
		</Box>
	)
}
