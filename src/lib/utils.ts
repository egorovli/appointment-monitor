import type { GetAvailableDaysResponse } from './types.ts'

/**
 * Checks if there are available days in the response
 */
export function hasAvailableDays(response: GetAvailableDaysResponse): boolean {
	return response.days.some(day => day.availableDays && day.availableDays.length > 0)
}

/**
 * Gets the total count of available days across all operations
 */
export function getTotalAvailableDays(response: GetAvailableDaysResponse): number {
	return response.days.reduce((sum, day) => sum + (day.availableDays?.length || 0), 0)
}
