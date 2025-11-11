import { useQuery } from '@tanstack/react-query'

import {
	getAvailableAppointmentDates,
	getAvailableAppointmentSlots,
	loadOperations
} from '../../../poznan.uw.gov.pl/index.ts'

export function useOperations() {
	return useQuery({
		queryKey: ['operations'],
		queryFn: loadOperations,
		staleTime: 1000 * 60 * 5 // 5 minutes
	})
}

export function useAppointmentDates({
	operationId,
	enabled
}: {
	operationId: string | undefined
	enabled: boolean
}) {
	return useQuery({
		queryKey: ['appointment-dates', operationId],
		queryFn: () => {
			if (!operationId) {
				throw new Error('Operation ID is required')
			}
			return getAvailableAppointmentDates({ operationId })
		},
		enabled: enabled && operationId !== undefined,
		staleTime: 1000 * 60 // 1 minute
	})
}

export function useAppointmentSlots({
	operationId,
	date,
	enabled
}: {
	operationId: string | undefined
	date: string | undefined
	enabled: boolean
}) {
	return useQuery({
		queryKey: ['appointment-slots', operationId, date],
		queryFn: () => {
			if (!operationId || !date) {
				throw new Error('Operation ID and date are required')
			}
			return getAvailableAppointmentSlots({ operationId, date })
		},
		enabled: enabled && operationId !== undefined && date !== undefined,
		staleTime: 1000 * 30 // 30 seconds
	})
}
