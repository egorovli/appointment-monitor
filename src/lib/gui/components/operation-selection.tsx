import { Box, Text, useFocus, useInput } from 'ink'
import { useState } from 'react'

import type { Operation } from '../../../poznan.uw.gov.pl/index.ts'
import { ErrorDisplay } from './error-display.tsx'
import { LoadingSpinner } from './loading-spinner.tsx'
import { useOperations } from '../lib/query/hooks.ts'

export interface OperationSelectionProps {
	onSelect: (operation: Operation) => void
}

export function OperationSelection({ onSelect }: OperationSelectionProps) {
	const { data: operations, isLoading, isError, error } = useOperations()
	const [selectedIndex, setSelectedIndex] = useState(0)

	const handleSelect = () => {
		if (operations && operations.length > 0 && operations[selectedIndex]) {
			onSelect(operations[selectedIndex])
		}
	}

	useInput((input, key) => {
		if (isLoading || !operations || operations.length === 0) {
			return
		}

		if (key.upArrow) {
			setSelectedIndex(prev => {
				const newIndex = Math.max(0, prev - 1)
				return newIndex
			})
		} else if (key.downArrow) {
			setSelectedIndex(prev => {
				const newIndex = Math.min(operations.length - 1, prev + 1)
				return newIndex
			})
		} else if (key.return || input === ' ') {
			handleSelect()
		}
	})

	if (isLoading) {
		return (
			<Box
				flexDirection='column'
				paddingX={1}
			>
				<Text bold>Select Operation:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<LoadingSpinner message='Loading operations...' />
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
				<Text bold>Select Operation:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<ErrorDisplay
						error={error}
						title='Failed to load operations'
					/>
				</Box>
			</Box>
		)
	}

	if (!operations || operations.length === 0) {
		return (
			<Box
				flexDirection='column'
				paddingX={1}
			>
				<Text bold>Select Operation:</Text>
				<Box
					marginTop={1}
					marginLeft={2}
				>
					<Text color='yellow'>No operations available</Text>
				</Box>
			</Box>
		)
	}

	return (
		<Box
			flexDirection='column'
			paddingX={1}
		>
			<Text bold>Select Operation:</Text>
			<Box
				flexDirection='column'
				marginTop={1}
				marginLeft={2}
			>
				{operations.map((operation, index) => {
					const isSelected = index === selectedIndex
					return (
						<OperationItem
							key={operation.id}
							operation={operation}
							isSelected={isSelected}
							index={index}
						/>
					)
				})}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					↑↓: Navigate | Enter/Space: Select | {operations.length} operation(s) available
				</Text>
			</Box>
		</Box>
	)
}

function OperationItem({
	operation,
	isSelected,
	index
}: {
	operation: Operation
	isSelected: boolean
	index: number
}) {
	const { isFocused } = useFocus({ id: `operation-${index}` })

	return (
		<Box>
			<Text color={isSelected && isFocused ? 'cyan' : isSelected ? 'green' : 'white'}>
				{isSelected ? '→ ' : '  '}
				{operation.name}
				{operation.description ? ` - ${operation.description}` : ''}
			</Text>
		</Box>
	)
}
