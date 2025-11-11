import { Box, Text, useFocus, useInput } from 'ink'
import { useState } from 'react'

import type { AppointmentDate } from '../../../poznan.uw.gov.pl/index.ts'
import { ErrorDisplay } from './error-display.tsx'
import { LoadingSpinner } from './loading-spinner.tsx'
import { useAppointmentDates } from '../lib/query/hooks.ts'

export interface DateSelectionProps {
	operationId: string
	onSelect: (date: string) => void
	onBack: () => void
}

export function DateSelection({ operationId, onSelect, onBack }: DateSelectionProps) {
	const {
		data: dates,
		isLoading,
		isError,
		error,
		isFetching
	} = useAppointmentDates({
		operationId,
		enabled: true
	})
	const [selectedIndex, setSelectedIndex] = useState(0)
	const availableDates = dates?.filter(date => date.available) ?? []

	const handleSelect = () => {
		if (availableDates.length > 0 && availableDates[selectedIndex]) {
			onSelect(availableDates[selectedIndex].date)
		}
	}

	useInput((input, key) => {
		if (isLoading || availableDates.length === 0) {
			return
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1))
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(availableDates.length - 1, prev + 1))
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
				<Text bold>Select Date:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<LoadingSpinner message='Loading available dates...' />
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
				<Text bold>Select Date:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<ErrorDisplay
						error={error}
						title='Failed to load dates'
					/>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>Press 'b' or ← to go back</Text>
				</Box>
			</Box>
		)
	}

	if (availableDates.length === 0) {
		return (
			<Box
				flexDirection='column'
				paddingX={1}
			>
				<Text bold>Select Date:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<Text color='yellow'>No available dates found</Text>
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
			<Text bold>Select Date:</Text>
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
				{availableDates.map((date, index) => {
					const isSelected = index === selectedIndex
					return (
						<DateItem
							key={date.date}
							date={date}
							isSelected={isSelected}
							index={index}
						/>
					)
				})}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					↑↓: Navigate | Enter/Space: Select | ←/b: Back | {availableDates.length} date(s) available
				</Text>
			</Box>
		</Box>
	)
}

function DateItem({
	date,
	isSelected,
	index
}: {
	date: AppointmentDate
	isSelected: boolean
	index: number
}) {
	const { isFocused } = useFocus({ id: `date-${index}` })

	return (
		<Box>
			<Text color={isSelected && isFocused ? 'cyan' : isSelected ? 'green' : 'white'}>
				{isSelected ? '→ ' : '  '}
				{date.date}
			</Text>
		</Box>
	)
}
