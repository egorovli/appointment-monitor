/**
 * Simulation client wrapper for dry-run mode
 * Intercepts checkSlots() and createReservation() calls to simulate API responses
 */

import type {
	CheckSlotsInput,
	CheckSlotsResult,
	ConsulateDetails,
	Country,
	CreateReservationInput,
	CreateReservationResult,
	GetConsulateDetailsInput,
	GetConsulateServicesInput,
	GetCountriesInput,
	RequestCaptchaInput,
	RequestCaptchaResult,
	Service,
	VerifyCaptchaInput,
	VerifyCaptchaResult
} from './client.ts'

import { ApiError, SlotUnavailableError } from '../../tui/lib/error-classifier.ts'

import { sampleCheckSlotsResults, sampleCreateReservationResults } from './simulation-data.ts'

import type { Client } from './client.ts'

export interface SimulationConfig {
	slotSearchSuccessRate: number // 0-1
	slotReservationSuccessRate: number // 0-1
}

/**
 * Simulation client that wraps a real Client and simulates checkSlots() and createReservation()
 * All other methods are delegated to the real client
 */
export class SimulationClient implements AsyncDisposable {
	private realClient: Client
	private config: SimulationConfig

	constructor(realClient: Client, config: SimulationConfig) {
		this.realClient = realClient
		this.config = config
	}

	async initialize(): Promise<void> {
		return this.realClient.initialize()
	}

	async requestCaptcha(input?: RequestCaptchaInput): Promise<RequestCaptchaResult> {
		return this.realClient.requestCaptcha(input)
	}

	async verifyCaptcha(input: VerifyCaptchaInput): Promise<VerifyCaptchaResult> {
		return this.realClient.verifyCaptcha(input)
	}

	async completeCaptcha(): Promise<string> {
		return this.realClient.completeCaptcha()
	}

	async getCountries(input?: GetCountriesInput): Promise<Country[]> {
		return this.realClient.getCountries(input)
	}

	async getConsulateServices(input: GetConsulateServicesInput): Promise<Service[]> {
		return this.realClient.getConsulateServices(input)
	}

	async getConsulateDetails(input: GetConsulateDetailsInput): Promise<ConsulateDetails> {
		return this.realClient.getConsulateDetails(input)
	}

	/**
	 * Generate a UUID-like token for simulation
	 */
	private generateToken(): string {
		return `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`
	}

	/**
	 * Simulate checkSlots() call based on success rate
	 */
	async checkSlots(input: CheckSlotsInput): Promise<CheckSlotsResult> {
		const random = Math.random()

		if (random < this.config.slotSearchSuccessRate) {
			// Success - return random sample data
			const samples = sampleCheckSlotsResults
			const sample = samples[Math.floor(Math.random() * samples.length)]

			// Adapt sample to match input parameters
			return {
				...sample,
				locationId: Number.parseInt(input.locationId, 10),
				token: this.generateToken() // Generate unique token for each call
				// Keep other fields from sample (consulateId, serviceType, etc.)
			}
		}

		// Failure - throw appropriate error
		const errorType = Math.random()

		if (errorType < 0.7) {
			// 70% - Slot unavailable (most common)
			throw new SlotUnavailableError('Slot is no longer available')
		}

		if (errorType < 0.9) {
			// 20% - No available slots
			throw new ApiError('No available slots', 'BRAK_WOLNYCH_TERMINOW', 400)
		}

		if (errorType < 0.95) {
			// 5% - Soft rate limit
			throw new Error('HTTP 429 Too Many Requests')
		}

		// 5% - Network/timeout error
		throw new Error('Network error: Connection timeout')
	}

	/**
	 * Simulate createReservation() call based on success rate
	 */
	async createReservation(input: CreateReservationInput): Promise<CreateReservationResult> {
		const random = Math.random()

		if (random < this.config.slotReservationSuccessRate) {
			// Success - return random sample data
			const samples = sampleCreateReservationResults
			const sample = samples[Math.floor(Math.random() * samples.length)]

			// Adapt sample to match input date
			return {
				...sample,
				tickets: sample.tickets.map(ticket => ({
					...ticket,
					date: input.date // Use the requested date
				}))
			}
		}

		// Failure - throw appropriate error
		const errorType = Math.random()

		if (errorType < 0.8) {
			// 80% - Slot unavailable (most common)
			throw new SlotUnavailableError('Slot is no longer available')
		}

		if (errorType < 0.95) {
			// 15% - Slot already taken
			throw new ApiError('Termin zajety', 'TERMIN_ZAJETY', 400)
		}

		// 5% - Invalid token
		throw new ApiError('Invalid token', 'NIEPRAWIDLOWY_TOKEN', 400)
	}

	dispose(): void {
		this.realClient.dispose()
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.realClient[Symbol.asyncDispose]()
	}
}
