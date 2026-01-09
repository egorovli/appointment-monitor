import type {
	CheckSlotsResult,
	ConsulateDetails,
	CreateReservationResult
} from '../e-konsulat.gov.pl/index.ts'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const RAW_JSON_MARKER = '--- RAW JSON ---'

export interface SessionStorageData {
	NV_RESERVATION_DATA_CONTEXT: {
		dzienWizyty: string
		czas: string
		adres: {
			adres11: string
			adres12: string
		}
		tylko_dzieci: boolean
	}
	NV_TICKETS: {
		ticketsList: Array<{
			bilet: string
			data: string
			godzina: string
			wniosekDziecka: boolean
		}>
		visitorIndex: number
	}
	INSTITUTION_CONTEXT_DATA?: {
		nazwaPlacowki: string
		nazwaKraju: string
		dostepneUslugi: {
			wizaKrajowa: boolean
			wizaKrajowa_WYPELNIJ: boolean
			wizaSchengen: boolean
			wizaSchengen_WYPELNIJ: boolean
			mrgBialorus: boolean
			mrgBialorus_WYPELNIJ: boolean
			mrgUkraina: boolean
			mrgUkraina_WYPELNIJ: boolean
			mrgRosja: boolean
			mrgRosja_WYPELNIJ: boolean
			paszportowe: boolean
			prawne: boolean
			obywatelskie: boolean
			kartaPolaka: boolean
		}
		adresPlacowki: {
			adres11: string
			adres12: string
			adres21: string
			adres22: string
		}
		emaile: {
			spotkanieZKonsulem: string
			sprawyPaszportowe: string
			sprawyPrawne: string
			sprawyObywatelskie: string
			kartaPolaka: string
		}
	}
}

export interface BrowserSessionOptions {
	reservationResult: CreateReservationResult
	checkSlotsResult: CheckSlotsResult
	consulateDetails: ConsulateDetails
	headless?: boolean
}

export interface SavedReservationData {
	reservationResult: CreateReservationResult
	checkSlotsResult: CheckSlotsResult
	consulateDetails: ConsulateDetails
	timestamp: string
}

function formatAddress(address: ConsulateDetails['address']): string {
	const { formattedAddress, adres11, adres12, adres21, adres22 } = address
	if (formattedAddress?.trim()) {
		return formattedAddress.trim()
	}

	return [adres11, adres12, adres21, adres22].filter(Boolean).join(', ')
}

function indentBlock(value: string, indent = '  '): string {
	return value
		.split('\n')
		.map(line => `${indent}${line}`)
		.join('\n')
}

export function buildFormUrl(checkSlotsResult: CheckSlotsResult): string {
	const { consulateId, serviceType } = checkSlotsResult
	const servicePath = serviceType === 1 ? 'wiza-krajowa' : 'wiza-schengen'
	return `https://secure.e-konsulat.gov.pl/placowki/${consulateId}/${servicePath}/formularz/nowy`
}

export function generateConsoleScript(sessionData: SessionStorageData, formUrl: string): string {
	const nvReservation = JSON.stringify(sessionData.NV_RESERVATION_DATA_CONTEXT)
	const nvTickets = JSON.stringify(sessionData.NV_TICKETS)

	let script = `// Paste this in browser console on the form page
sessionStorage.setItem('NV_RESERVATION_DATA_CONTEXT', '${nvReservation.replace(/'/g, "\\'")}');
sessionStorage.setItem('NV_TICKETS', '${nvTickets.replace(/'/g, "\\'")}');`

	if (sessionData.INSTITUTION_CONTEXT_DATA) {
		const institution = JSON.stringify(sessionData.INSTITUTION_CONTEXT_DATA)
		script += `\nsessionStorage.setItem('INSTITUTION_CONTEXT_DATA', '${institution.replace(/'/g, "\\'")}');`
	}

	script += `\nlocation.href = '${formUrl.replace(/'/g, "\\'")}';`

	return script
}

function formatReservationFileContent(data: SavedReservationData): string {
	const { reservationResult, checkSlotsResult, consulateDetails, timestamp } = data
	const sessionData = buildSessionStorageData({
		reservationResult,
		checkSlotsResult,
		consulateDetails
	})
	const formUrl = buildFormUrl(checkSlotsResult)
	const consoleScript = generateConsoleScript(sessionData, formUrl)
	const primaryTicket = reservationResult.tickets[0]

	const lines: string[] = [
		'RESERVATION SUCCESSFUL',
		`Timestamp: ${timestamp}`,
		`Ticket: ${reservationResult.ticket}`,
		`Date: ${primaryTicket?.date ?? 'Unknown'}`,
		`Time: ${primaryTicket?.time ?? 'TBD'}`,
		`People: ${reservationResult.tickets.length}`,
		`Consulate: ${consulateDetails.consulateName} (${consulateDetails.countryName})`,
		`Address: ${formatAddress(consulateDetails.address)}`,
		'',
		'Form URL:',
		formUrl,
		'',
		'Console Script:',
		indentBlock(consoleScript),
		'',
		'Session Storage:',
		'NV_RESERVATION_DATA_CONTEXT:',
		indentBlock(JSON.stringify(sessionData.NV_RESERVATION_DATA_CONTEXT, null, 2)),
		'NV_TICKETS:',
		indentBlock(JSON.stringify(sessionData.NV_TICKETS, null, 2)),
		sessionData.INSTITUTION_CONTEXT_DATA
			? [
					'INSTITUTION_CONTEXT_DATA:',
					indentBlock(JSON.stringify(sessionData.INSTITUTION_CONTEXT_DATA, null, 2))
				].join('\n')
			: undefined,
		'',
		RAW_JSON_MARKER,
		indentBlock(JSON.stringify(data, null, 2)),
		''
	].filter(Boolean) as string[]

	return lines.join('\n')
}

/**
 * Builds session storage data from reservation and checkSlots results
 */
export function buildSessionStorageData(options: BrowserSessionOptions): SessionStorageData {
	const { reservationResult, consulateDetails } = options

	const firstTicket = reservationResult.tickets[0]
	if (!firstTicket) {
		throw new Error('Reservation result must contain at least one ticket')
	}

	return {
		NV_RESERVATION_DATA_CONTEXT: {
			dzienWizyty: firstTicket.date,
			czas: new Date().toISOString(),
			adres: {
				adres11: consulateDetails.address.adres11,
				adres12: consulateDetails.address.adres12
			},
			tylko_dzieci: reservationResult.isChildApplication
		},
		NV_TICKETS: {
			ticketsList: reservationResult.tickets.map(ticket => ({
				bilet: ticket.ticket,
				data: ticket.date,
				godzina: ticket.time || '',
				wniosekDziecka: ticket.isChildApplication
			})),
			visitorIndex: 0
		},
		INSTITUTION_CONTEXT_DATA: {
			nazwaPlacowki: consulateDetails.consulateName,
			nazwaKraju: consulateDetails.countryName,
			dostepneUslugi: consulateDetails.availableServices,
			adresPlacowki: {
				adres11: consulateDetails.address.adres11,
				adres12: consulateDetails.address.adres12,
				adres21: consulateDetails.address.adres21,
				adres22: consulateDetails.address.adres22
			},
			emaile: consulateDetails.emails
		}
	}
}

/**
 * Saves reservation data to local file for testing
 */
export async function saveReservationData(
	data: SavedReservationData,
	storageDir = '.reservations'
): Promise<string> {
	try {
		await mkdir(storageDir, { recursive: true })
		const filename = `reservation-${Date.now()}.txt`
		const filepath = join(storageDir, filename)
		const content = formatReservationFileContent(data)
		await writeFile(filepath, content, 'utf-8')
		console.error(`[STORAGE] Saved reservation data to ${filepath}`)
		return filepath
	} catch (error) {
		console.error('[STORAGE] Failed to save reservation data:', error)
		throw error
	}
}

/**
 * Loads reservation data from local file
 */
export async function loadReservationData(filepath: string): Promise<SavedReservationData> {
	try {
		const content = await readFile(filepath, 'utf-8')
		try {
			return JSON.parse(content) as SavedReservationData
		} catch {
			// Fall back to parsing the raw JSON block from plain-text export
			const markerIndex = content.indexOf(RAW_JSON_MARKER)
			if (markerIndex === -1) {
				throw new Error('Unsupported reservation file format')
			}

			const rawJson = content.slice(markerIndex + RAW_JSON_MARKER.length).trimStart()

			return JSON.parse(rawJson) as SavedReservationData
		}
	} catch (error) {
		console.error('[STORAGE] Failed to load reservation data:', error)
		throw error
	}
}
