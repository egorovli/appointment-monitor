/**
 * Success display component
 * Shows reservation result with session data for browser injection
 */

import type {
	CheckSlotsResult,
	ConsulateDetails,
	CreateReservationResult
} from '../../lib/e-konsulat.gov.pl/index.ts'

import { Badge, StatusMessage } from '@inkjs/ui'
import { Box, Text } from 'ink'
import { useEffect, useRef, useState } from 'react'

import {
	buildSessionStorageData,
	buildFormUrl,
	generateConsoleScript,
	saveReservationData
} from '../../lib/browser/session-injection.ts'

export interface SuccessDisplayProps {
	result: CreateReservationResult
	checkSlotsResult: CheckSlotsResult
	consulateDetails: ConsulateDetails
}

export function SuccessDisplay({
	result,
	checkSlotsResult,
	consulateDetails
}: SuccessDisplayProps): React.ReactNode {
	const [copied, setCopied] = useState(false)
	const [savedPath, setSavedPath] = useState<string | undefined>()
	const [error, setError] = useState<string | undefined>()
	const hasInitializedRef = useRef(false)

	// Build session data
	const sessionData = buildSessionStorageData({
		reservationResult: result,
		checkSlotsResult,
		consulateDetails
	})

	const formUrl = buildFormUrl(checkSlotsResult)
	const consoleScript = generateConsoleScript(sessionData, formUrl)

	// Get first ticket info
	const firstTicket = result.tickets[0]
	const ticketDate = firstTicket?.date || 'Unknown'
	const ticketTime = firstTicket?.time || ''

	// Copy to clipboard and save on mount - ONLY ONCE
	useEffect(() => {
		// Guard: only run once
		if (hasInitializedRef.current) {
			return
		}
		hasInitializedRef.current = true

		const init = async () => {
			// Try to copy to clipboard
			try {
				const clipboardy = await import('clipboardy')
				await clipboardy.default.write(consoleScript)
				setCopied(true)
			} catch (e) {
				// Clipboard might not be available
				console.error('Failed to copy to clipboard:', e)
			}

			// Save reservation data - ONLY ONCE
			try {
				const path = await saveReservationData({
					reservationResult: result,
					checkSlotsResult,
					consulateDetails,
					timestamp: new Date().toISOString()
				})
				setSavedPath(path)
			} catch (e) {
				setError(`Failed to save: ${e}`)
			}
		}

		void init()
	}, [consoleScript, result, checkSlotsResult, consulateDetails])

	return (
		<Box
			flexDirection='column'
			padding={1}
			gap={1}
		>
			{/* Success Header */}
			<StatusMessage variant='success'>RESERVATION SUCCESSFUL!</StatusMessage>

			{/* Ticket Info Section */}
			<Box
				flexDirection='column'
				borderStyle='round'
				borderColor='green'
				paddingX={1}
			>
				<Text
					bold
					color='green'
				>
					TICKET INFO
				</Text>
				<Box
					flexDirection='column'
					marginTop={1}
				>
					<Box gap={1}>
						<Text dimColor>Ticket ID:</Text>
						<Badge color='green'>{result.ticket.substring(0, 12)}...</Badge>
					</Box>
					<Box
						gap={2}
						marginTop={1}
					>
						<Box gap={1}>
							<Text dimColor>Date:</Text>
							<Text
								color='cyan'
								bold
							>
								{ticketDate}
							</Text>
						</Box>
						<Box gap={1}>
							<Text dimColor>Time:</Text>
							<Text
								color='cyan'
								bold
							>
								{ticketTime || 'TBD'}
							</Text>
						</Box>
						<Box gap={1}>
							<Text dimColor>People:</Text>
							<Text
								color='cyan'
								bold
							>
								{result.tickets.length}
							</Text>
						</Box>
					</Box>
				</Box>
			</Box>

			{/* Instructions Section */}
			<Box
				flexDirection='column'
				borderStyle='round'
				borderColor='blue'
				paddingX={1}
			>
				<Text
					bold
					color='blue'
				>
					INSTRUCTIONS
				</Text>

				{/* Step 1: URL */}
				<Box
					flexDirection='column'
					marginTop={1}
				>
					<Text bold>1. Open in browser:</Text>
					<Text
						color='blue'
						wrap='truncate'
					>
						{formUrl}
					</Text>
				</Box>

				{/* Step 2: Console Script */}
				<Box
					flexDirection='column'
					marginTop={1}
				>
					<Box justifyContent='space-between'>
						<Text bold>2. Paste in browser console (F12) </Text>
						{copied && <Badge color='green'>COPIED</Badge>}
					</Box>
					<Box
						flexDirection='column'
						paddingX={1}
						paddingY={1}
						borderStyle='single'
						borderColor='gray'
						marginTop={1}
					>
						{consoleScript
							.split('\n')
							.slice(0, 4)
							.map((line, i) => (
								<Text
									key={`line-${i}-${line.slice(0, 20)}`}
									dimColor
								>
									{line}
								</Text>
							))}
						{consoleScript.split('\n').length > 4 && <Text dimColor>...</Text>}
					</Box>
				</Box>

				{/* Step 3 */}
				<Box
					marginTop={1}
					marginBottom={1}
				>
					<Text bold>3. Fill out the form after page reloads</Text>
				</Box>
			</Box>

			{/* Footer */}
			<Box
				flexDirection='column'
				gap={0}
			>
				{savedPath && <StatusMessage variant='info'>Data saved to: {savedPath}</StatusMessage>}
				{error && <StatusMessage variant='error'>{error}</StatusMessage>}
				<Box marginTop={1}>
					<Text dimColor>Press Ctrl+C to exit</Text>
				</Box>
			</Box>
		</Box>
	)
}
