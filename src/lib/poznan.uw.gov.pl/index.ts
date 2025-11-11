/**
 * API for working with the appointment system at poznan.uw.gov.pl
 */

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
