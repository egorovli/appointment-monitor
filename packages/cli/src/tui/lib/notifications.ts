import notifier from 'node-notifier'

export interface NotificationPayload {
	title: string
	message: string
	subtitle?: string
	sound?: boolean | string
}

export function sendNotification(payload: NotificationPayload): void {
	notifier.notify({
		title: payload.title,
		subtitle: payload.subtitle,
		message: payload.message,
		sound: payload.sound ?? true,
		wait: false
	})
}

export function notifySlotsFound(options: { count: number; locationName?: string }): void {
	const { count, locationName } = options
	const suffix = locationName ? ` at ${locationName}` : ''
	sendNotification({
		title: 'Slots found',
		message: `${count} slot${count === 1 ? '' : 's'} available${suffix}`
	})
}

export function notifyReservationSuccess(options: {
	date?: string
	locationName?: string
	ticket?: string
}): void {
	const { date, locationName, ticket } = options
	const suffix = locationName ? ` @ ${locationName}` : ''
	const shortTicket = ticket ? ` (ticket ${ticket.slice(0, 6)}...)` : ''
	sendNotification({
		title: 'Reservation succeeded',
		message: `${date ?? 'Slot'} reserved${suffix}${shortTicket}`,
		sound: true
	})
}
