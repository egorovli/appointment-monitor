import * as fs from 'node:fs'
import * as path from 'node:path'

import type { Solver } from '../captcha/solver.ts'

interface CaptchaResponse {
	id: string
	iloscZnakow: number
	image: string
}

interface CaptchaVerificationResponse {
	ok: boolean
	token: string
}

export interface Consulate {
	id: string
	name: string
}

export interface Country {
	id: string
	name: string
	consulates: Consulate[]
}

export interface Location {
	id: string
	name: string
}

export interface Service {
	id: string
	name: string
	locations: Location[]
}

export interface RequestCaptchaInput {
	width?: number
	height?: number
	signal?: AbortSignal
}

export interface RequestCaptchaResult {
	token: string
	characters: number
	imageData: Buffer
}

export interface VerifyCaptchaInput {
	code: string
	token: string
	signal?: AbortSignal
}

export interface VerifyCaptchaResult {
	success: boolean
	token: string
}

export interface GetCountriesInput {
	signal?: AbortSignal
}

export interface GetConsulateServicesInput {
	consulateId: string
	signal?: AbortSignal
}

export interface GetConsulateDetailsInput {
	languageVersion: number
	consulateId: string
	signal?: AbortSignal
}

export interface ConsulateDetails {
	countryName: string
	consulateName: string
	information?: string
	availableServices: {
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
	address: {
		adres11: string
		adres12: string
		adres21: string
		adres22: string
		formattedAddress?: string
	}
	emails: {
		spotkanieZKonsulem: string
		sprawyPaszportowe: string
		sprawyPrawne: string
		sprawyObywatelskie: string
		kartaPolaka: string
	}
}

export interface CheckSlotsInput {
	locationId: string
	amount: number
	token: string
	signal?: AbortSignal
}

export interface Slot {
	date?: string
	time?: string
	[key: string]: unknown
}

export interface CheckSlotsResult {
	amount: number
	slots: Slot[]
	locationId?: number
	consulateId?: number
	serviceType?: number
	token?: string
	identityToken?: string
}

export interface CreateReservationInput {
	date: string
	locationId: string
	languageVersion?: number
	token: string
	amount: number
	onlyChildren?: boolean
	signal?: AbortSignal
}

export interface ReservationTicket {
	ticket: string
	date: string
	time: string
	verifiedIdentity?: boolean
	isChildApplication: boolean
}

export interface CreateReservationResult {
	ticket: string
	tickets: ReservationTicket[]
	verifiedIdentity?: boolean
	isChildApplication: boolean
}

export interface Init {
	captcha: {
		solver: Solver
	}
}

export class Client implements AsyncDisposable {
	static readonly baseUrl = 'https://secure.e-konsulat.gov.pl'
	static readonly apiBaseUrl = 'https://api.e-konsulat.gov.pl'
	static readonly requestTimeout = 30000
	static readonly proxyUrl?: string

	private captcha: Init['captcha']

	constructor(init: Init) {
		this.captcha = init.captcha
	}

	async initialize(): Promise<void> {
		await this.captcha.solver.initialize()
	}

	async requestCaptcha(input: RequestCaptchaInput = {}): Promise<RequestCaptchaResult> {
		const { width = 200, height = 100, signal } = input

		if (width <= 0 || height <= 0) {
			throw new Error('Invalid dimensions: width and height must be positive')
		}

		try {
			const response = await fetch(`${Client.apiBaseUrl}/api/u-captcha/generuj`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
					'Accept': 'application/json, text/plain, */*',
					'Accept-Language': 'en-US,en;q=0.7,ru;q=0.3',
					'DNT': '1',
					'Origin': Client.baseUrl,
					'Referer': Client.baseUrl
				},
				body: JSON.stringify({
					imageWidth: width,
					imageHeight: height
				}),
				signal: signal ?? AbortSignal.timeout(Client.requestTimeout),
				proxy: Client.proxyUrl
			})

			if (!response.ok) {
				throw new Error(`Failed to fetch CAPTCHA: HTTP ${response.status} ${response.statusText}`)
			}

			const data = (await response.json()) as CaptchaResponse

			if (!data.id || !data.image) {
				throw new Error('Invalid CAPTCHA response: missing required fields')
			}

			const imageData = Buffer.from(data.image, 'base64')

			return {
				token: data.id,
				characters: data.iloscZnakow,
				imageData
			}
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw new Error(`CAPTCHA request timeout after ${Client.requestTimeout}ms`)
				}
				throw error
			}
			throw new Error(`Failed to request CAPTCHA: ${String(error)}`)
		}
	}

	async verifyCaptcha(input: VerifyCaptchaInput): Promise<VerifyCaptchaResult> {
		const { code, token, signal } = input

		if (!code || !token) {
			throw new Error('Invalid input: code and token are required')
		}

		try {
			const response = await fetch(`${Client.apiBaseUrl}/api/u-captcha/sprawdz`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
					'Accept': 'application/json, text/plain, */*',
					'Accept-Language': 'en-US,en;q=0.7,ru;q=0.3',
					'DNT': '1',
					'Origin': Client.baseUrl,
					'Referer': Client.baseUrl
				},
				body: JSON.stringify({
					kod: code,
					token
				}),
				signal: signal ?? AbortSignal.timeout(Client.requestTimeout),
				proxy: Client.proxyUrl
			})

			let responseBody: string | undefined
			if (!response.ok) {
				try {
					responseBody = await response.text()
				} catch (bodyError) {
					responseBody = `<<failed to read body: ${bodyError instanceof Error ? bodyError.message : String(bodyError)}>>`
				}

				let logPath: string | undefined
				if (response.status === 403) {
					logPath = this.logCaptchaFailure({
						status: response.status,
						statusText: response.statusText,
						headers: Array.from(response.headers.entries()),
						body: responseBody
					})
				}

				throw new Error(
					`Failed to verify CAPTCHA: HTTP ${response.status} ${response.statusText}${
						logPath ? ` (logged at ${logPath})` : ''
					}`
				)
			}

			const data = (await response.json()) as CaptchaVerificationResponse

			return {
				success: data.ok,
				token: data.token
			}
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw new Error(`CAPTCHA verification timeout after ${Client.requestTimeout}ms`)
				}
				throw error
			}
			throw new Error(`Failed to verify CAPTCHA: ${String(error)}`)
		}
	}

	async completeCaptcha(): Promise<string> {
		const captcha = await this.requestCaptcha()
		const solution = await this.captcha.solver.solveCaptcha(captcha.imageData)
		const result = await this.verifyCaptcha({ code: solution, token: captcha.token })

		if (!result.success) {
			throw new Error('CAPTCHA verification failed')
		}

		return result.token
	}

	private logCaptchaFailure(details: {
		status: number
		statusText: string
		headers: [string, string][]
		body?: string
	}): string | undefined {
		try {
			const logDir = path.resolve(process.cwd(), 'logs')
			fs.mkdirSync(logDir, { recursive: true })

			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			const logPath = path.join(logDir, `captcha-verify-403-${timestamp}.log`)
			const headerLines = details.headers.map(([key, value]) => `${key}: ${value}`).join('\n')
			const body = (details.body ?? '<empty>').slice(0, 4000)

			const content = [
				`Status: ${details.status} ${details.statusText}`,
				'Headers:',
				headerLines,
				'',
				'Body:',
				body
			].join('\n')

			fs.writeFileSync(logPath, content, 'utf8')
			console.error(`[CAPTCHA] Logged HTTP 403 verification response to ${logPath}`)
			return logPath
		} catch (error) {
			console.error('[CAPTCHA] Failed to log HTTP 403 verification response', error)
			return undefined
		}
	}

	async getCountries(input: GetCountriesInput = {}): Promise<Country[]> {
		const { signal } = input

		try {
			const response = await fetch(
				`${Client.apiBaseUrl}/api/konfiguracja/placowki/placowki-w-krajach/2`,
				{
					method: 'GET',
					headers: {
						'Accept': 'application/json, text/plain, */*',
						'Accept-Language': 'en-US,en;q=0.7,ru;q=0.3',
						'DNT': '1',
						'Origin': Client.baseUrl,
						'Referer': Client.baseUrl,
						'User-Agent':
							'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0'
					},
					signal: signal ?? AbortSignal.timeout(Client.requestTimeout)
					// proxy: Client.proxyUrl
				}
			)

			if (!response.ok) {
				throw new Error(`Failed to fetch countries: HTTP ${response.status} ${response.statusText}`)
			}

			interface Country {
				id: number
				nazwa: string
				placowki: Consulate[]
			}

			interface Consulate {
				id: number
				nazwa: string
			}

			const data = (await response.json()) as Country[]

			return data
				.filter(country => (country.nazwa || '').trim().length > 0)
				.sort((a, b) => a.nazwa.localeCompare(b.nazwa))
				.map(country => ({
					id: String(country.id),
					name: country.nazwa.trim(),
					consulates: country.placowki
						.filter(consulate => (consulate.nazwa || '').trim().length > 0)
						.sort((a, b) => a.nazwa.localeCompare(b.nazwa))
						.map(consulate => ({
							id: String(consulate.id),
							name: consulate.nazwa.trim()
						}))
				}))
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw new Error(`Countries request timeout after ${Client.requestTimeout}ms`)
				}
				throw error
			}
			throw new Error(`Failed to get countries: ${String(error)}`)
		}
	}

	async getConsulateServices(input: GetConsulateServicesInput): Promise<Service[]> {
		const { consulateId, signal } = input

		try {
			const response = await fetch(
				`${Client.apiBaseUrl}/api/konfiguracja/uslugi-wizowe/krajowe/${consulateId}/1`,
				{
					method: 'GET',
					headers: {
						'Accept': 'application/json, text/plain, */*',
						'Accept-Language': 'en-US,en;q=0.7,ru;q=0.3',
						'DNT': '1',
						'Origin': Client.baseUrl,
						'Referer': Client.baseUrl,
						'User-Agent':
							'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0'
					},
					signal: signal ?? AbortSignal.timeout(Client.requestTimeout),
					proxy: Client.proxyUrl
				}
			)

			if (!response.ok) {
				throw new Error(`Failed to fetch services: HTTP ${response.status} ${response.statusText}`)
			}

			interface Location {
				id: number
				nazwa: string
			}

			interface Service {
				id: number
				nazwa: string
				lokalizacje: Location[]
			}

			interface GetConsulateServicesResponse {
				uslugi: Service[]
			}

			const data = (await response.json()) as GetConsulateServicesResponse

			return data.uslugi
				.filter(service => (service.nazwa || '').trim().length > 0)
				.sort((a, b) => a.nazwa.localeCompare(b.nazwa))
				.map(service => ({
					id: String(service.id),
					name: service.nazwa.trim(),
					locations: service.lokalizacje
						.filter(location => (location.nazwa || '').trim().length > 0)
						.sort((a, b) => a.nazwa.localeCompare(b.nazwa))
						.map(location => ({
							id: String(location.id),
							name: location.nazwa.trim()
						}))
				}))
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw new Error(`Services request timeout after ${Client.requestTimeout}ms`)
				}
				throw error
			}
			throw new Error(`Failed to get consulate services: ${String(error)}`)
		}
	}

	async getConsulateDetails(input: GetConsulateDetailsInput): Promise<ConsulateDetails> {
		const { languageVersion, consulateId, signal } = input

		try {
			const response = await fetch(
				`${Client.apiBaseUrl}/api/konfiguracja/placowki/dane-placowki/${languageVersion}/${consulateId}`,
				{
					method: 'GET',
					headers: {
						'Accept': 'application/json, text/plain, */*',
						'Accept-Language': 'en-US,en;q=0.7,ru;q=0.3',
						'DNT': '1',
						'Origin': Client.baseUrl,
						'Referer': Client.baseUrl,
						'User-Agent':
							'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0'
					},
					signal: signal ?? AbortSignal.timeout(Client.requestTimeout),
					proxy: Client.proxyUrl
				}
			)

			if (!response.ok) {
				throw new Error(
					`Failed to fetch consulate details: HTTP ${response.status} ${response.statusText}`
				)
			}

			interface ConsulateDetailsResponse {
				nazwaKraju: string
				nazwaPlacowki: string
				informacje: string | null
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
					zlokalizowanyAdres?: string
				}
				emaile: {
					spotkanieZKonsulem: string
					sprawyPaszportowe: string
					sprawyPrawne: string
					sprawyObywatelskie: string
					kartaPolaka: string
				}
			}

			const data = (await response.json()) as ConsulateDetailsResponse

			return {
				countryName: data.nazwaKraju,
				consulateName: data.nazwaPlacowki,
				information: data.informacje ?? undefined,
				availableServices: data.dostepneUslugi,
				address: {
					adres11: data.adresPlacowki.adres11,
					adres12: data.adresPlacowki.adres12,
					adres21: data.adresPlacowki.adres21,
					adres22: data.adresPlacowki.adres22,
					formattedAddress: data.adresPlacowki.zlokalizowanyAdres
				},
				emails: data.emaile
			}
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw new Error(`Consulate details request timeout after ${Client.requestTimeout}ms`)
				}
				throw error
			}
			throw new Error(`Failed to get consulate details: ${String(error)}`)
		}
	}

	async checkSlots(input: CheckSlotsInput): Promise<CheckSlotsResult> {
		const { locationId, amount, token, signal } = input

		if (!locationId || !token) {
			throw new Error('Invalid input: locationId and token are required')
		}

		if (amount <= 0) {
			throw new Error('Invalid input: amount must be positive')
		}

		try {
			const response = await fetch(
				`${Client.apiBaseUrl}/api/rezerwacja-wizyt-wizowych/terminy/${locationId}/${amount}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'User-Agent':
							'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
						'Accept': 'application/json, text/plain, */*',
						'Accept-Language': 'en-US,en;q=0.7,ru;q=0.3',
						'DNT': '1',
						'Origin': Client.baseUrl,
						'Referer': Client.baseUrl
					},
					body: JSON.stringify({
						captchaToken: token
					}),
					signal: signal ?? AbortSignal.timeout(Client.requestTimeout),
					proxy: Client.proxyUrl
				}
			)

			if (!response.ok) {
				throw new Error(`Failed to check slots: HTTP ${response.status} ${response.statusText}`)
			}

			interface CheckSlotsResponse {
				tabelaDni: Array<string | Record<string, unknown>> | null
				idLokalizacji?: number
				idPlacowki?: number
				rodzajUslugi?: number
				token?: string
				identityToken?: string | null
			}

			const data = (await response.json()) as CheckSlotsResponse

			const slots =
				data.tabelaDni?.map((slot, index): Slot => {
					if (typeof slot === 'string') {
						return {
							date: slot,
							raw: slot
						}
					}

					return slot
				}) ?? []

			return {
				amount: slots.length,
				slots,
				locationId: data.idLokalizacji,
				consulateId: data.idPlacowki,
				serviceType: data.rodzajUslugi,
				token: data.token,
				identityToken: data.identityToken ?? undefined
			}
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw new Error(`Slots check timeout after ${Client.requestTimeout}ms`)
				}
				throw error
			}
			throw new Error(`Failed to check slots: ${String(error)}`)
		}
	}

	async createReservation(input: CreateReservationInput): Promise<CreateReservationResult> {
		const {
			date,
			locationId,
			languageVersion = 1,
			token,
			amount,
			onlyChildren = false,
			signal
		} = input

		if (!date || !locationId || !token) {
			throw new Error('Invalid input: date, locationId, and token are required')
		}

		if (amount <= 0) {
			throw new Error('Invalid input: amount must be positive')
		}

		// Validate date format (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			throw new Error('Invalid date format: expected YYYY-MM-DD')
		}

		const url = `${Client.apiBaseUrl}/api/rezerwacja-wizyt-wizowych/rezerwacje`

		const requestBody = {
			data: date,
			id_lokalizacji: Number.parseInt(locationId, 10),
			id_wersji_jezykowej: languageVersion,
			token,
			liczba_osob: amount,
			tylko_dzieci: onlyChildren
		}

		const requestHeaders = {
			'Content-Type': 'application/json',
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
			'Accept': 'application/json, text/plain, */*',
			'Accept-Language': 'en-US,en;q=0.7,ru;q=0.3',
			'DNT': '1',
			'Origin': Client.baseUrl,
			'Referer': Client.baseUrl
		}

		// Log request details
		console.error('[RESERVATION REQUEST]')
		console.error('URL:', url)
		console.error('Method: POST')
		console.error('Headers:', JSON.stringify(requestHeaders, null, 2))
		console.error('Body:', JSON.stringify(requestBody, null, 2))
		console.error('Input:', JSON.stringify(input, null, 2))

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: requestHeaders,
				body: JSON.stringify(requestBody),
				signal: signal ?? AbortSignal.timeout(Client.requestTimeout),
				proxy: Client.proxyUrl
			})

			// Log response details
			console.error('[RESERVATION RESPONSE]')
			console.error('Status:', response.status, response.statusText)
			console.error(
				'Headers:',
				JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)
			)
			console.error('URL:', response.url)

			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unable to read error response')
				console.error('Error Response Body:', errorText)
				throw new Error(
					`Failed to create reservation: HTTP ${response.status} ${response.statusText}`
				)
			}

			interface ReservationTicket {
				bilet: string
				data: string
				godzina: string
				zweryfikowanaTozsamosc: boolean | null
				wniosekDziecka: boolean
			}

			interface ReservationResponse {
				bilet: string
				listaBiletow: ReservationTicket[]
				zweryfikowanaTozsamosc: boolean | null
				wniosekDziecka: boolean
			}

			const responseText = await response.text()
			console.error('Response Body (raw):', responseText)

			const data = JSON.parse(responseText) as ReservationResponse
			console.error('Response Body (parsed):', JSON.stringify(data, null, 2))

			if (!data.bilet || !Array.isArray(data.listaBiletow)) {
				throw new Error('Invalid reservation response: missing required fields')
			}

			const result = {
				ticket: data.bilet,
				tickets: data.listaBiletow.map(ticket => ({
					ticket: ticket.bilet,
					date: ticket.data,
					time: ticket.godzina,
					verifiedIdentity: ticket.zweryfikowanaTozsamosc ?? undefined,
					isChildApplication: ticket.wniosekDziecka
				})),
				verifiedIdentity: data.zweryfikowanaTozsamosc ?? undefined,
				isChildApplication: data.wniosekDziecka
			}

			console.error('[RESERVATION RESULT]', JSON.stringify(result, null, 2))
			console.error('[RESERVATION REQUEST END]')

			return result
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw new Error(`Reservation creation timeout after ${Client.requestTimeout}ms`)
				}
				throw error
			}
			throw new Error(`Failed to create reservation: ${String(error)}`)
		}
	}

	dispose(): void {
		this.captcha.solver.dispose()
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.dispose()
	}
}
