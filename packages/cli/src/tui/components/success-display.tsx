/**
 * Success display component
 * Shows reservation result with session data for browser injection
 */

import type {
	CheckSlotsResult,
	ConsulateDetails,
	CreateReservationResult
} from '../../lib/e-konsulat.gov.pl/index.ts'

import type { SessionStorageData } from '../../lib/browser/session-injection.ts'

import { Box, Text } from 'ink'
import { useEffect, useRef, useState } from 'react'

import {
	buildSessionStorageData,
	saveReservationData
} from '../../lib/browser/session-injection.ts'

export interface SuccessDisplayProps {
	result: CreateReservationResult
	checkSlotsResult: CheckSlotsResult
	consulateDetails: ConsulateDetails
}

/**
 * Build the form URL from checkSlots result
 */
function buildFormUrl(checkSlotsResult: CheckSlotsResult): string {
	const { consulateId, serviceType } = checkSlotsResult
	const servicePath = serviceType === 1 ? 'wiza-krajowa' : 'wiza-schengen'
	return `https://secure.e-konsulat.gov.pl/placowki/${consulateId}/${servicePath}/formularz/nowy`
}

/**
 * Generate console script for session storage injection
 */
function generateConsoleScript(sessionData: SessionStorageData, formUrl: string): string {
	const nvReservation = JSON.stringify(sessionData.NV_RESERVATION_DATA_CONTEXT)
	const nvTickets = JSON.stringify(sessionData.NV_TICKETS)

	let script = `// Paste this in browser console on the form page
sessionStorage.setItem('NV_RESERVATION_DATA_CONTEXT', '${nvReservation.replace(/'/g, "\\'")}');
sessionStorage.setItem('NV_TICKETS', '${nvTickets.replace(/'/g, "\\'")}');`

	if (sessionData.INSTITUTION_CONTEXT_DATA) {
		const institution = JSON.stringify(sessionData.INSTITUTION_CONTEXT_DATA)
		script += `
sessionStorage.setItem('INSTITUTION_CONTEXT_DATA', '${institution.replace(/'/g, "\\'")}');`
	}

	script += `
location.href = '${formUrl.replace(/'/g, "\\'")}';`

	return script
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

		init()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Empty deps - only run once on mount

	return (
		<Box
			flexDirection='column'
			gap={1}
		>
			{/* Success Header */}
			<Box>
				<Text
					color='green'
					bold
				>
					RESERVATION SUCCESSFUL!
				</Text>
			</Box>

			{/* Divider */}
			<Text color='green'>{'─'.repeat(60)}</Text>

			{/* Ticket Info */}
			<Box flexDirection='column'>
				<Text>
					Ticket:{' '}
					<Text
						color='cyan'
						bold
					>
						{result.ticket.substring(0, 20)}...
					</Text>
				</Text>
				<Text>
					Date:{' '}
					<Text
						color='cyan'
						bold
					>
						{ticketDate}
					</Text>{' '}
					Time: <Text color='cyan'>{ticketTime || 'TBD'}</Text>
				</Text>
				<Text>
					People: <Text color='cyan'>{result.tickets.length}</Text>
				</Text>
			</Box>

			{/* Divider */}
			<Text color='green'>{'─'.repeat(60)}</Text>

			{/* Step 1: URL */}
			<Box flexDirection='column'>
				<Text bold>1. Open in browser:</Text>
				<Text color='blue'>{formUrl}</Text>
			</Box>

			{/* Step 2: Console Script */}
			<Box
				flexDirection='column'
				marginTop={1}
			>
				<Box>
					<Text bold>2. Paste in browser console (F12) </Text>
					{copied && <Text color='green'>- COPIED TO CLIPBOARD</Text>}
				</Box>
				<Text dimColor>{'─'.repeat(58)}</Text>
				<Box
					flexDirection='column'
					paddingLeft={1}
				>
					{consoleScript
						.split('\n')
						.slice(0, 6)
						.map((line, i) => (
							<Text
								key={`line-${i}-${line.slice(0, 20)}`}
								dimColor
							>
								{line}
							</Text>
						))}
					{consoleScript.split('\n').length > 6 && <Text dimColor>...</Text>}
				</Box>
				<Text dimColor>{'─'.repeat(58)}</Text>
			</Box>

			{/* Step 3 */}
			<Box marginTop={1}>
				<Text bold>3. Fill out the form after page reloads</Text>
			</Box>

			{/* Divider */}
			<Text color='green'>{'─'.repeat(60)}</Text>

			{/* Footer */}
			{savedPath && <Text dimColor>Saved: {savedPath}</Text>}
			{error && <Text color='red'>{error}</Text>}
			<Text dimColor>Press Ctrl+C to exit</Text>
		</Box>
	)
}
