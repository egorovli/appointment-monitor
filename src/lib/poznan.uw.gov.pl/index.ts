/**
 * API for working with the appointment system at poznan.uw.gov.pl
 */

import type { Browser, Page } from 'playwright'

import { chromium } from 'playwright'

export interface Operation {
	id: string
	name: string
	description?: string
}

export interface AppointmentDate {
	date: string
	available: boolean
}

export interface AppointmentSlot {
	time: string
	available: boolean
}

export interface GetAvailableAppointmentDatesParams {
	operationId: string
}

export interface GetAvailableAppointmentSlotsParams {
	operationId: string
	date: string
}

/**
 * Load available operations (services) for which appointments can be scheduled
 */
export async function loadOperations(): Promise<Operation[]> {
	await sleep()

	const mockOperations: Operation[] = [
		{
			id: 'passport-application',
			name: 'Wniosek o wydanie paszportu',
			description: 'Application for passport issuance'
		},
		{
			id: 'passport-collection',
			name: 'Odbior paszportu',
			description: 'Passport collection'
		},
		{
			id: 'id-card-application',
			name: 'Wniosek o wydanie dowodu osobistego',
			description: 'Application for ID card issuance'
		},
		{
			id: 'id-card-collection',
			name: 'Odbior dowodu osobistego',
			description: 'ID card collection'
		},
		{
			id: 'driving-license',
			name: 'Wymiana prawa jazdy',
			description: 'Driving license exchange'
		},
		{
			id: 'birth-certificate',
			name: 'Akt urodzenia',
			description: 'Birth certificate'
		}
	]

	return Promise.resolve(mockOperations)
}

/**
 * Get available appointment dates for a specific operation
 */
export async function getAvailableAppointmentDates({
	operationId
}: GetAvailableAppointmentDatesParams): Promise<AppointmentDate[]> {
	await sleep()

	// Generate dates for the next 30 days
	const dates: AppointmentDate[] = []
	const today = new Date()

	for (let i = 1; i <= 30; i++) {
		const date = new Date(today)
		date.setDate(today.getDate() + i)

		// Skip weekends (Saturday = 6, Sunday = 0)
		const dayOfWeek = date.getDay()
		const dateString = date.toISOString().split('T')[0] ?? ''

		if (dayOfWeek === 0 || dayOfWeek === 6) {
			dates.push({
				date: dateString,
				available: false
			})
			continue
		}

		// Randomly make some dates unavailable (about 30% unavailable)
		const isAvailable = Math.random() > 0.3

		dates.push({
			date: dateString,
			available: isAvailable
		})
	}

	return Promise.resolve(dates)
}

/**
 * Get available appointment slots for a given operation and date
 */
export async function getAvailableAppointmentSlots({
	operationId,
	date
}: GetAvailableAppointmentSlotsParams): Promise<AppointmentSlot[]> {
	await sleep()

	// Generate time slots from 8:00 to 16:00 with 30-minute intervals
	const slots: AppointmentSlot[] = []
	const startHour = 8
	const endHour = 16

	for (let hour = startHour; hour < endHour; hour++) {
		for (const minute of [0, 30]) {
			const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

			// Randomly make some slots unavailable (about 40% unavailable)
			const isAvailable = Math.random() > 0.4

			slots.push({
				time: timeString,
				available: isAvailable
			})
		}
	}

	return Promise.resolve(slots)
}

/**
 * Sleep for a random duration between 2 and 5 seconds
 */
export async function sleep(): Promise<void> {
	const min = 2000
	const max = 5000
	const duration = Math.floor(Math.random() * (max - min + 1)) + min
	return new Promise(resolve => setTimeout(resolve, duration))
}

/**
 * Client class for interacting with the poznan.uw.gov.pl appointment system.
 * Manages Playwright browser and page instances for web scraping and automation.
 */
export class Client {
	private browser: Browser | undefined
	private page: Page | undefined
	private readonly baseUrl = 'https://rejestracjapoznan.poznan.uw.gov.pl'
	private readonly headless: boolean

	constructor(options?: { headless?: boolean }) {
		this.headless = options?.headless ?? true
	}

	/**
	 * Initialize the browser and page instances.
	 * Must be called before using any other methods.
	 */
	async initialize(): Promise<void> {
		if (this.browser) {
			return
		}

		this.browser = await chromium.launch({
			headless: this.headless
		})

		this.page = await this.browser.newPage()
		await this.page.goto(this.baseUrl)
	}

	/**
	 * Get the current page instance.
	 * Throws an error if not initialized.
	 */
	private getPage(): Page {
		if (!this.page) {
			throw new Error('Client not initialized. Call initialize() first.')
		}
		return this.page
	}

	/**
	 * Load available operations (services) for which appointments can be scheduled.
	 * Placeholder implementation - will be replaced with actual scraping logic.
	 */
	async loadOperations(): Promise<Operation[]> {
		const page = this.getPage()
		// TODO: Implement actual scraping logic
		await page.waitForTimeout(1000)
		return []
	}

	/**
	 * Get available appointment dates for a specific operation.
	 * Placeholder implementation - will be replaced with actual scraping logic.
	 */
	async getAvailableAppointmentDates({
		operationId
	}: GetAvailableAppointmentDatesParams): Promise<AppointmentDate[]> {
		const page = this.getPage()
		// TODO: Implement actual scraping logic
		await page.waitForTimeout(1000)
		return []
	}

	/**
	 * Get available appointment slots for a given operation and date.
	 * Placeholder implementation - will be replaced with actual scraping logic.
	 */
	async getAvailableAppointmentSlots({
		operationId,
		date
	}: GetAvailableAppointmentSlotsParams): Promise<AppointmentSlot[]> {
		const page = this.getPage()
		// TODO: Implement actual scraping logic
		await page.waitForTimeout(1000)
		return []
	}

	/**
	 * Close the browser and clean up resources.
	 * Should be called when done using the client.
	 */
	async close(): Promise<void> {
		if (this.browser) {
			await this.browser.close()
			this.browser = undefined
			this.page = undefined
		}
	}

	/**
	 * Check if the client is initialized.
	 */
	isInitialized(): boolean {
		return this.browser !== undefined && this.page !== undefined
	}

	/**
	 * Reload the current page.
	 */
	async reload(): Promise<void> {
		const page = this.getPage()
		await page.reload()
	}

	/**
	 * Get the current browser and page state.
	 */
	async getBrowserState(): Promise<{
		isConnected: boolean
		url: string
		title: string
		isLoading: boolean
	}> {
		if (!this.browser || !this.page) {
			return {
				isConnected: false,
				url: '',
				title: '',
				isLoading: false
			}
		}

		const isConnected = this.browser.isConnected()
		const url = this.page.url()
		const title = await this.page.title()
		const isLoading = !this.page.isClosed()

		return {
			isConnected,
			url,
			title,
			isLoading
		}
	}

	/**
	 * Extract captcha token from the page.
	 * Looks for common captcha implementations (reCAPTCHA, hCaptcha, etc.)
	 */
	async getCaptchaToken(): Promise<string | undefined> {
		const page = this.getPage()

		try {
			// Try to find reCAPTCHA token
			// Code inside evaluate() runs in browser context, not Node.js
			// Using Function to avoid TypeScript checking browser-only APIs
			const recaptchaToken = await page.evaluate(
				new Function(`
					const recaptchaResponse = document.querySelector('[name="g-recaptcha-response"]');
					if (recaptchaResponse?.value) {
						return recaptchaResponse.value;
					}
					
					if (window.grecaptcha?.getResponse) {
						return window.grecaptcha.getResponse();
					}
					
					const hcaptchaResponse = document.querySelector('[name="h-captcha-response"]');
					if (hcaptchaResponse?.value) {
						return hcaptchaResponse.value;
					}
					
					const captchaElement = document.querySelector('[data-captcha]');
					if (captchaElement) {
						return captchaElement.getAttribute('data-captcha') || undefined;
					}
					
					return undefined;
				`) as () => string | undefined
			)

			return recaptchaToken
		} catch (error) {
			// If evaluation fails, return undefined
			return undefined
		}
	}
}
