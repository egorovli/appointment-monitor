import { Box, Text, useFocus, useInput } from 'ink'
import { useState } from 'react'

import type { AppointmentSlot } from '../../../poznan.uw.gov.pl/index.ts'
import { ErrorDisplay } from './error-display.tsx'
import { LoadingSpinner } from './loading-spinner.tsx'
import { useAppointmentSlots } from '../lib/query/hooks.ts'
import { useReload } from '../lib/use-reload.tsx'

export interface SlotSelectionProps {
	operationId: string
	date: string
	onSelect: (slot: AppointmentSlot) => void
	onBack: () => void
}

export function SlotSelection({ operationId, date, onSelect, onBack }: SlotSelectionProps) {
	const {
		data: slots,
		isLoading,
		isError,
		error,
		isFetching
	} = useAppointmentSlots({
		operationId,
		date,
		enabled: true
	})
	const [selectedIndex, setSelectedIndex] = useState(0)
	const availableSlots = slots?.filter(slot => slot.available) ?? []
	useReload()

	const handleSelect = () => {
		if (availableSlots.length > 0 && availableSlots[selectedIndex]) {
			onSelect(availableSlots[selectedIndex])
		}
	}

	useInput((input, key) => {
		if (isLoading || availableSlots.length === 0) {
			return
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1))
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(availableSlots.length - 1, prev + 1))
		} else if (key.return || input === ' ') {
			handleSelect()
		} else if (input === 'b' || key.leftArrow) {
			onBack()
		}
	})

	if (isLoading) {
		return (
			<Box
				flexDirection='column'
				paddingX={1}
			>
				<Text bold>Select Time Slot:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<LoadingSpinner message='Loading available slots...' />
				</Box>
			</Box>
		)
	}

	if (isError) {
		return (
			<Box
				flexDirection='column'
				paddingX={1}
			>
				<Text bold>Select Time Slot:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<ErrorDisplay
						error={error}
						title='Failed to load slots'
					/>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>Press 'b' or ← to go back</Text>
				</Box>
			</Box>
		)
	}

	if (availableSlots.length === 0) {
		return (
			<Box
				flexDirection='column'
				paddingX={1}
			>
				<Text bold>Select Time Slot:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<Text color='yellow'>No available slots found for {date}</Text>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>Press 'b' or ← to go back</Text>
				</Box>
			</Box>
		)
	}

	return (
		<Box
			flexDirection='column'
			paddingX={1}
		>
			<Text bold>Select Time Slot:</Text>
			<Box
				marginTop={1}
				marginLeft={2}
			>
				<Text dimColor>Date: {date}</Text>
			</Box>
			{isFetching && (
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<Text dimColor>Refreshing...</Text>
				</Box>
			)}
			<Box
				flexDirection='column'
				marginTop={1}
				marginLeft={2}
			>
				{availableSlots.map((slot, index) => {
					const isSelected = index === selectedIndex
					return (
						<SlotItem
							key={slot.time}
							slot={slot}
							isSelected={isSelected}
							index={index}
						/>
					)
				})}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					↑↓: Navigate | Enter/Space: Select | ←/b: Back | {availableSlots.length} slot(s) available
				</Text>
			</Box>
		</Box>
	)
}

function SlotItem({
	slot,
	isSelected,
	index
}: {
	slot: AppointmentSlot
	isSelected: boolean
	index: number
}) {
	const { isFocused } = useFocus({ id: `slot-${index}` })

	return (
		<Box>
			<Text color={isSelected && isFocused ? 'cyan' : isSelected ? 'green' : 'white'}>
				{isSelected ? '→ ' : '  '}
				{slot.time}
			</Text>
		</Box>
	)
}
