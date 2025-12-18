import type {
	CreateReservationResult,
	CheckSlotsResult,
	ConsulateDetails
} from '../e-konsulat.gov.pl/index.ts'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

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
		const filename = `reservation-${Date.now()}.json`
		const filepath = join(storageDir, filename)
		await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8')
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
		return JSON.parse(content) as SavedReservationData
	} catch (error) {
		console.error('[STORAGE] Failed to load reservation data:', error)
		throw error
	}
}

/**
 * Opens browser with injected session storage and navigates to form page
 */
export async function openReservationForm(
	options: BrowserSessionOptions
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
	const { checkSlotsResult, headless = false } = options

	if (!checkSlotsResult.consulateId) {
		throw new Error('Consulate ID is required from checkSlots result')
	}

	if (!checkSlotsResult.serviceType) {
		throw new Error('Service type is required from checkSlots result')
	}

	// Determine service path based on service type
	// rodzajUslugi: 1 = wiza-krajowa, 2 = wiza-schengen
	const servicePath = checkSlotsResult.serviceType === 1 ? 'wiza-krajowa' : 'wiza-schengen'

	// Build session storage data
	const sessionData = buildSessionStorageData(options)

	// Launch browser
	const browser = await chromium.launch({
		headless,
		args: ['--disable-blink-features=AutomationControlled']
	})

	const context = await browser.newContext({
		viewport: { width: 1280, height: 720 },
		userAgent:
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
	})

	// Inject session storage before any page loads
	// This runs before any page scripts execute
	await context.addInitScript((storage: SessionStorageData) => {
		if (window.location.hostname === 'secure.e-konsulat.gov.pl') {
			// Set NV_RESERVATION_DATA_CONTEXT
			window.sessionStorage.setItem(
				'NV_RESERVATION_DATA_CONTEXT',
				JSON.stringify(storage.NV_RESERVATION_DATA_CONTEXT)
			)

			// Set NV_TICKETS
			window.sessionStorage.setItem('NV_TICKETS', JSON.stringify(storage.NV_TICKETS))

			// Set INSTITUTION_CONTEXT_DATA if available
			if (storage.INSTITUTION_CONTEXT_DATA) {
				window.sessionStorage.setItem(
					'INSTITUTION_CONTEXT_DATA',
					JSON.stringify(storage.INSTITUTION_CONTEXT_DATA)
				)
			}
		}
	}, sessionData)

	const page = await context.newPage()

	// Construct form URL
	const formUrl = `https://secure.e-konsulat.gov.pl/placowki/${checkSlotsResult.consulateId}/${servicePath}/formularz/nowy`

	console.error('[BROWSER] Opening form URL:', formUrl)
	console.error('[BROWSER] Session storage data:', JSON.stringify(sessionData, null, 2))

	// Navigate to form page
	await page.goto(formUrl, {
		waitUntil: 'networkidle',
		timeout: 30000
	})

	return { browser, context, page }
}
