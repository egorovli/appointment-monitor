import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'

export interface BrowserManager {
	getPage(): Promise<Page>
	close(): Promise<void>
	isInitialized(): boolean
}

export class PlaywrightBrowserManager implements BrowserManager {
	private browser: Browser | null = null
	private page: Page | null = null
	private readonly headless: boolean
	private readonly baseUrl = 'https://rejestracjapoznan.poznan.uw.gov.pl'

	constructor(headless = true) {
		this.headless = headless
	}

	async initialize(): Promise<void> {
		if (this.browser) {
			return
		}

		this.browser = await chromium.launch({
			headless: this.headless
		})

		this.page = await this.browser.newPage()

		// Navigate to the reservation page
		await this.page.goto(this.baseUrl, {
			waitUntil: 'domcontentloaded',
			timeout: 30000
		})

		// Wait for the page to fully load - wait for operation buttons
		await this.page.waitForSelector('button.operation-button', {
			timeout: 15000
		})

		// Wait for Vue app to initialize (ensure sessionStorage has token)
		await this.page.waitForFunction(
			() => {
				return sessionStorage.getItem('token') !== null
			},
			{ timeout: 10000 }
		)
	}

	async getPage(): Promise<Page> {
		if (!this.page) {
			throw new Error('Browser not initialized. Call initialize() first.')
		}

		// Check if page is still valid (not closed)
		try {
			await this.page.evaluate(() => document.title)
		} catch {
			// Page was closed, recreate it
			this.page = null
			await this.initialize()
		}

		return this.page
	}

	async resetPage(): Promise<void> {
		if (this.page) {
			try {
				await this.page.close()
			} catch {
				// Ignore errors
			}
			this.page = null
		}

		if (this.browser) {
			this.page = await this.browser.newPage()
			await this.page.goto(this.baseUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 30000
			})

			await this.page.waitForSelector('button.operation-button', {
				timeout: 15000
			})

			await this.page.waitForFunction(
				() => {
					return sessionStorage.getItem('token') !== null
				},
				{ timeout: 10000 }
			)
		}
	}

	isInitialized(): boolean {
		return this.browser !== null && this.page !== null
	}

	async close(): Promise<void> {
		try {
			if (this.page) {
				await this.page.close()
				this.page = null
			}
		} catch {
			// Ignore cleanup errors
		}

		try {
			if (this.browser) {
				await this.browser.close()
				this.browser = null
			}
		} catch {
			// Ignore cleanup errors
		}
	}
}
