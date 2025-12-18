import type {
	Client as EKonsulatClient,
	Country,
	Consulate
} from '../lib/e-konsulat.gov.pl/index.ts'

import type {
	Slot,
	CreateReservationResult,
	CheckSlotsResult
} from '../lib/e-konsulat.gov.pl/index.ts'

import type { Solver as CaptchaSolver } from '../lib/captcha/index.ts'

import { QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'
import { Select, Spinner, TextInput } from '@inkjs/ui'
import * as ink from 'ink'
import * as zustand from 'zustand'
import type * as React from 'react'
import { useEffect, useState, useRef } from 'react'

import * as query from './lib/query/index.ts'
import { openReservationForm, saveReservationData } from '../lib/browser/session-injection.ts'

const IMPORTANT_COUNTRIES = ['RUSSIAN FEDERATION', 'MONTENEGRO']

function countriesSorter(a: Country, b: Country): number {
	const ai = IMPORTANT_COUNTRIES.indexOf(a.name)
	const bi = IMPORTANT_COUNTRIES.indexOf(b.name)

	if (ai !== -1 && bi !== -1) {
		return ai - bi
	}

	if (ai !== -1) {
		return -1
	}

	if (bi !== -1) {
		return 1
	}

	return 0
}

enum Step {
	CountrySelection = 'country-selection',
	ConsulateSelection = 'consulate-selection',
	ServiceSelection = 'service-selection',
	LocationSelection = 'location-selection',
	AmountInput = 'amount-input',
	CheckingSlots = 'checking-slots',
	SlotsDisplay = 'slots-display',
	CreatingReservation = 'creating-reservation',
	ReservationResult = 'reservation-result'
}

interface Values {
	countryId?: string
	consulateId?: string
	serviceId?: string
	locationId?: string
	amount: string
	slots?: Slot[]
	selectedSlotIndex?: number
	checkSlotsToken?: string
	checkSlotsResult?: CheckSlotsResult
	reservationResult?: CreateReservationResult
}

interface Store {
	step: Step
	values: Values
	setStep: (step: Step) => void
	setCountryId: (id?: string) => void
	setConsulateId: (id?: string) => void
	setServiceId: (id?: string) => void
	setLocationId: (id?: string) => void
	setAmount: (amount: string) => void
	setSlots: (slots?: Slot[]) => void
	setSelectedSlotIndex: (index?: number) => void
	setCheckSlotsToken: (token?: string) => void
	setCheckSlotsResult: (result?: CheckSlotsResult) => void
	setReservationResult: (result?: CreateReservationResult) => void
	reset: () => void
}

const useStore = zustand.create<Store>(set => ({
	step: Step.CountrySelection,
	values: {
		amount: '1'
	},
	setStep: step => set({ step }),
	setCountryId: id =>
		set(state => ({
			values: {
				...state.values,
				countryId: id,
				consulateId: undefined,
				serviceId: undefined,
				locationId: undefined
			}
		})),
	setConsulateId: id =>
		set(state => ({
			values: {
				...state.values,
				consulateId: id,
				serviceId: undefined,
				locationId: undefined
			}
		})),
	setServiceId: id =>
		set(state => ({
			values: {
				...state.values,
				serviceId: id,
				locationId: undefined
			}
		})),
	setLocationId: id =>
		set(state => ({
			values: {
				...state.values,
				locationId: id
			}
		})),
	setAmount: amount =>
		set(state => ({
			values: {
				...state.values,
				amount
			}
		})),
	setSlots: slots =>
		set(state => ({
			values: {
				...state.values,
				slots
			}
		})),
	setSelectedSlotIndex: index =>
		set(state => ({
			values: {
				...state.values,
				selectedSlotIndex: index
			}
		})),
	setCheckSlotsToken: token =>
		set(state => ({
			values: {
				...state.values,
				checkSlotsToken: token
			}
		})),
	setCheckSlotsResult: result =>
		set(state => ({
			values: {
				...state.values,
				checkSlotsResult: result
			}
		})),
	setReservationResult: result =>
		set(state => ({
			values: {
				...state.values,
				reservationResult: result
			}
		})),
	reset: () =>
		set({
			step: Step.CountrySelection,
			values: {
				amount: '1'
			}
		})
}))

export interface AppProps {
	eKonsulat: {
		client: EKonsulatClient
	}

	captcha: {
		solver: CaptchaSolver
	}
}

export function App(props: AppProps): React.ReactNode {
	useAppExit()

	return (
		<QueryClientProvider client={query.client}>
			<SlotCheckerUI
				client={props.eKonsulat.client}
				solver={props.captcha.solver}
			/>
		</QueryClientProvider>
	)
}

interface SlotCheckerUIProps {
	client: EKonsulatClient
	solver: CaptchaSolver
}

function SlotCheckerUI(props: SlotCheckerUIProps): React.ReactNode {
	const step = useStore(state => state.step)

	return (
		<ink.Box flexDirection='column'>
			<ink.Box marginBottom={1}>
				<ink.Text bold>Appointment Slot Checker</ink.Text>
			</ink.Box>
			{step === Step.CountrySelection && <CountryStep client={props.client} />}
			{step === Step.ConsulateSelection && <ConsulateStep client={props.client} />}
			{step === Step.ServiceSelection && <ServiceStep client={props.client} />}
			{step === Step.LocationSelection && <LocationStep client={props.client} />}
			{step === Step.AmountInput && <AmountStep />}
			{step === Step.CheckingSlots && (
				<CheckingStep
					client={props.client}
					solver={props.solver}
				/>
			)}
			{step === Step.SlotsDisplay && <SlotsDisplayStep client={props.client} />}
			{step === Step.CreatingReservation && <CreatingReservationStep client={props.client} />}
			{step === Step.ReservationResult && <ReservationResultStep client={props.client} />}
		</ink.Box>
	)
}

interface CountryStepProps {
	client: EKonsulatClient
}

function CountryStep(props: CountryStepProps): React.ReactNode {
	const {
		data: countries,
		isLoading,
		error
	} = useQuery({
		queryKey: ['countries'],
		queryFn: async () => {
			const countries = await props.client.getCountries()
			return countries.sort(countriesSorter)
		}
	})

	const setCountryId = useStore(state => state.setCountryId)
	const setStep = useStore(state => state.setStep)

	if (isLoading) {
		return <Spinner label='Loading countries...' />
	}

	if (error) {
		return <ink.Text color='red'>Error: {String(error)}</ink.Text>
	}

	if (!countries || countries.length === 0) {
		return <ink.Text color='red'>No countries available</ink.Text>
	}

	return (
		<ink.Box flexDirection='column'>
			<ink.Text>Select country:</ink.Text>
			<Select
				options={countries.map(country => ({
					label: country.name,
					value: country.id
				}))}
				onChange={value => {
					setCountryId(value)
					setStep(Step.ConsulateSelection)
				}}
			/>
		</ink.Box>
	)
}

interface ConsulateStepProps {
	client: EKonsulatClient
}

function ConsulateStep(props: ConsulateStepProps): React.ReactNode {
	const countryId = useStore(state => state.values.countryId)
	const {
		data: countries,
		isLoading,
		error
	} = useQuery({
		queryKey: ['countries'],
		queryFn: async () => {
			const countries = await props.client.getCountries()
			return countries.sort(countriesSorter)
		}
	})

	const setConsulateId = useStore(state => state.setConsulateId)
	const setStep = useStore(state => state.setStep)

	if (isLoading) {
		return <Spinner label='Loading consulates...' />
	}

	if (error) {
		return <ink.Text color='red'>Error: {String(error)}</ink.Text>
	}

	const country = countries?.find(c => c.id === countryId)
	const consulates: Consulate[] = country?.consulates || []

	if (consulates.length === 0) {
		return <ink.Text color='red'>No consulates available</ink.Text>
	}

	return (
		<ink.Box flexDirection='column'>
			<ink.Text>Select consulate:</ink.Text>
			<Select
				options={consulates.map((consulate: Consulate) => ({
					label: consulate.name,
					value: consulate.id
				}))}
				onChange={value => {
					setConsulateId(value)
					setStep(Step.ServiceSelection)
				}}
			/>
		</ink.Box>
	)
}

interface ServiceStepProps {
	client: EKonsulatClient
}

function ServiceStep(props: ServiceStepProps): React.ReactNode {
	const consulateId = useStore(state => state.values.consulateId)
	const {
		data: services,
		isLoading,
		error
	} = useQuery({
		queryKey: ['services', consulateId],
		queryFn: () => {
			if (!consulateId) {
				throw new Error('Consulate ID is required')
			}
			return props.client.getConsulateServices({ consulateId })
		},
		enabled: !!consulateId
	})

	const setServiceId = useStore(state => state.setServiceId)
	const setStep = useStore(state => state.setStep)

	if (isLoading) {
		return <Spinner label='Loading services...' />
	}

	if (error) {
		return <ink.Text color='red'>Error: {String(error)}</ink.Text>
	}

	if (!services || services.length === 0) {
		return <ink.Text color='red'>No services available</ink.Text>
	}

	return (
		<ink.Box flexDirection='column'>
			<ink.Text>Select service:</ink.Text>
			<Select
				options={services.map(service => ({
					label: service.name,
					value: service.id
				}))}
				onChange={value => {
					setServiceId(value)
					setStep(Step.LocationSelection)
				}}
			/>
		</ink.Box>
	)
}

interface LocationStepProps {
	client: EKonsulatClient
}

function LocationStep(props: LocationStepProps): React.ReactNode {
	const consulateId = useStore(state => state.values.consulateId)
	const serviceId = useStore(state => state.values.serviceId)
	const { data: services } = useQuery({
		queryKey: ['services', consulateId],
		queryFn: () => {
			if (!consulateId) {
				throw new Error('Consulate ID is required')
			}
			return props.client.getConsulateServices({ consulateId })
		},
		enabled: !!consulateId
	})

	const setLocationId = useStore(state => state.setLocationId)
	const setStep = useStore(state => state.setStep)

	const service = services?.find(s => s.id === serviceId)
	const locations = service?.locations || []

	if (locations.length === 0) {
		return <ink.Text color='red'>No locations available</ink.Text>
	}

	return (
		<ink.Box flexDirection='column'>
			<ink.Text>Select location:</ink.Text>
			<Select
				options={locations.map(location => ({
					label: location.name,
					value: location.id
				}))}
				onChange={value => {
					setLocationId(value)
					setStep(Step.AmountInput)
				}}
			/>
		</ink.Box>
	)
}

function AmountStep(): React.ReactNode {
	const amount = useStore(state => state.values.amount)
	const setAmount = useStore(state => state.setAmount)
	const setStep = useStore(state => state.setStep)

	return (
		<ink.Box flexDirection='column'>
			<ink.Text>Number of slots to check:</ink.Text>
			<TextInput
				placeholder='Enter amount...'
				defaultValue={amount}
				onSubmit={value => {
					const amountNum = Number.parseInt(value, 10)
					if (Number.isNaN(amountNum) || amountNum <= 0) {
						return
					}
					setAmount(value)
					setStep(Step.CheckingSlots)
				}}
			/>
			<ink.Text dimColor>Press Enter to check slots</ink.Text>
		</ink.Box>
	)
}

interface CheckingStepProps {
	client: EKonsulatClient
	solver: CaptchaSolver
}

function CheckingStep(props: CheckingStepProps): React.ReactNode {
	const values = useStore(state => state.values)
	const { locationId, amount } = values
	const setSlots = useStore(state => state.setSlots)
	const setStep = useStore(state => state.setStep)

	const { data, isPending, error, mutate } = useMutation({
		mutationFn: async () => {
			if (!locationId) {
				throw new Error('Location ID is required')
			}
			const amountNum = Number.parseInt(amount, 10)
			if (Number.isNaN(amountNum) || amountNum <= 0) {
				throw new Error('Invalid amount')
			}

			// Handle CAPTCHA silently
			const token = await props.client.completeCaptcha()

			const result = await props.client.checkSlots({
				locationId,
				amount: amountNum,
				token
			})

			return result
		}
	})

	useEffect(() => {
		mutate()
	}, [mutate])

	const setCheckSlotsToken = useStore(state => state.setCheckSlotsToken)
	const setCheckSlotsResult = useStore(state => state.setCheckSlotsResult)

	useEffect(() => {
		if (data) {
			setSlots(data.slots)
			setCheckSlotsToken(data.token)
			setCheckSlotsResult(data)
			setStep(Step.SlotsDisplay)
		}
	}, [data, setSlots, setCheckSlotsToken, setCheckSlotsResult, setStep])

	if (isPending) {
		return <Spinner label='Checking for available slots...' />
	}

	if (error) {
		return (
			<ink.Box flexDirection='column'>
				<ink.Text color='red'>Error: {String(error)}</ink.Text>
				<ink.Box marginTop={1}>
					<ink.Text dimColor>Press 'q' to exit or 'r' to try again</ink.Text>
				</ink.Box>
			</ink.Box>
		)
	}

	return undefined
}

function formatSlotLabel(slot: Slot, index: number): string {
	// Try to format date and time nicely
	const date = slot.date
	const time = slot.time

	if (date && time) {
		return `${date} ${time}:00`
	}
	if (date) {
		return date
	}
	if (time) {
		return `Time slot: ${time}`
	}

	// Fallback: try to extract from raw numeric keys
	const numericKeys = Object.keys(slot)
		.filter(key => /^\d+$/.test(key))
		.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))

	if (numericKeys.length >= 3) {
		const values = numericKeys.map(key => String(slot[key]))
		const year = values[0] || ''
		const month = values[1] || ''
		const day = values[2] || ''
		const timeSlot = values[values.length - 1] || ''

		if (year && month && day) {
			const paddedMonth = month.padStart(2, '0')
			const paddedDay = day.padStart(2, '0')
			const fullYear = year.length === 2 ? `20${year}` : year
			const dateStr = `${fullYear}-${paddedMonth}-${paddedDay}`
			return timeSlot && timeSlot !== '-' ? `${dateStr} ${timeSlot}:00` : dateStr
		}
	}

	// Last resort: show slot number
	return `Slot ${index + 1}`
}

interface SlotsDisplayStepProps {
	client: EKonsulatClient
}

function SlotsDisplayStep(props: SlotsDisplayStepProps): React.ReactNode {
	const slots = useStore(state => state.values.slots)
	const selectedSlotIndex = useStore(state => state.values.selectedSlotIndex)
	const setSelectedSlotIndex = useStore(state => state.setSelectedSlotIndex)
	const setStep = useStore(state => state.setStep)

	if (!slots || slots.length === 0) {
		return (
			<ink.Box flexDirection='column'>
				<ink.Text color='yellow'>No slots available</ink.Text>
				<ink.Box marginTop={1}>
					<ink.Text dimColor>Press 'q' to exit or 'r' to check again</ink.Text>
				</ink.Box>
			</ink.Box>
		)
	}

	// Create slot options for selection with formatted labels
	const slotOptions = slots.map((slot, index) => ({
		label: formatSlotLabel(slot, index),
		value: String(index)
	}))

	const selectedSlot = selectedSlotIndex !== undefined ? slots[selectedSlotIndex] : undefined

	return (
		<ink.Box flexDirection='column'>
			<ink.Box marginBottom={1}>
				<ink.Text>
					Available slots:{' '}
					<ink.Text
						color='green'
						bold
					>
						{slots.length}
					</ink.Text>
				</ink.Text>
			</ink.Box>
			{selectedSlotIndex === undefined ? (
				<ink.Box flexDirection='column'>
					<ink.Text>Select a slot:</ink.Text>
					<Select
						options={slotOptions}
						onChange={value => {
							const index = Number.parseInt(value, 10)
							setSelectedSlotIndex(index)
							setStep(Step.CreatingReservation)
						}}
					/>
				</ink.Box>
			) : (
				<ink.Box flexDirection='column'>
					<ink.Text color='green'>
						Selected:{' '}
						{selectedSlot
							? formatSlotLabel(selectedSlot, selectedSlotIndex)
							: `Slot ${selectedSlotIndex + 1}`}
					</ink.Text>
					<ink.Box marginTop={1}>
						<ink.Text dimColor>Press 'q' to exit or 'r' to check again</ink.Text>
					</ink.Box>
				</ink.Box>
			)}
		</ink.Box>
	)
}

interface CreatingReservationStepProps {
	client: EKonsulatClient
}

function CreatingReservationStep(props: CreatingReservationStepProps): React.ReactNode {
	const values = useStore(state => state.values)
	const { locationId, amount, slots, selectedSlotIndex, checkSlotsToken } = values
	const setReservationResult = useStore(state => state.setReservationResult)
	const setStep = useStore(state => state.setStep)

	const { data, isPending, error, mutate } = useMutation({
		mutationFn: async () => {
			if (!locationId || !checkSlotsToken) {
				throw new Error('Location ID and token are required')
			}
			if (selectedSlotIndex === undefined || !slots || selectedSlotIndex >= slots.length) {
				throw new Error('Invalid slot selection')
			}

			const selectedSlot = slots[selectedSlotIndex]
			if (!selectedSlot) {
				throw new Error('Selected slot is undefined')
			}

			const date = selectedSlot.date

			if (!date) {
				throw new Error('Selected slot does not have a date')
			}

			const amountNum = Number.parseInt(amount, 10)
			if (Number.isNaN(amountNum) || amountNum <= 0) {
				throw new Error('Invalid amount')
			}

			// Extract date in YYYY-MM-DD format
			// If date is already in correct format, use it
			// Otherwise try to parse from slot data
			let reservationDate = date
			if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
				// Try to extract from numeric keys if date is not in correct format
				const numericKeys = Object.keys(selectedSlot)
					.filter(key => /^\d+$/.test(key))
					.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))

				if (numericKeys.length >= 3) {
					const slotValues = numericKeys.map(key => String(selectedSlot[key]))
					const year = slotValues[0] || ''
					const month = slotValues[1] || ''
					const day = slotValues[2] || ''

					if (year && month && day) {
						const paddedMonth = month.padStart(2, '0')
						const paddedDay = day.padStart(2, '0')
						const fullYear = year.length === 2 ? `20${year}` : year
						reservationDate = `${fullYear}-${paddedMonth}-${paddedDay}`
					}
				}

				if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
					throw new Error(`Unable to extract valid date from slot: ${date}`)
				}
			}

			const result = await props.client.createReservation({
				date: reservationDate,
				locationId,
				token: checkSlotsToken,
				amount: amountNum
			})

			return result
		}
	})

	useEffect(() => {
		mutate()
	}, [mutate])

	useEffect(() => {
		if (data) {
			setReservationResult(data)
			setStep(Step.ReservationResult)
		}
	}, [data, setReservationResult, setStep])

	if (isPending) {
		return <Spinner label='Creating reservation...' />
	}

	if (error) {
		return (
			<ink.Box flexDirection='column'>
				<ink.Text color='red'>Error creating reservation: {String(error)}</ink.Text>
				<ink.Box marginTop={1}>
					<ink.Text dimColor>Press 'q' to exit or 'r' to try again</ink.Text>
				</ink.Box>
			</ink.Box>
		)
	}

	return undefined
}

interface ReservationResultStepProps {
	client: EKonsulatClient
}

function ReservationResultStep(props: ReservationResultStepProps): React.ReactNode {
	const values = useStore(state => state.values)
	const { reservationResult, checkSlotsResult, consulateId } = values
	const [browserOpening, setBrowserOpening] = useState(false)
	const [browserError, setBrowserError] = useState<string | undefined>()
	const browserOpenedRef = useRef(false)

	// Get consulate name from countries data
	const { data: countries } = useQuery({
		queryKey: ['countries'],
		queryFn: async () => {
			const countries = await props.client.getCountries()
			return countries.sort(countriesSorter)
		}
	})

	// Fetch consulate details
	const { data: consulateDetails } = useQuery({
		queryKey: ['consulateDetails', checkSlotsResult?.consulateId],
		queryFn: async () => {
			if (!checkSlotsResult?.consulateId) {
				throw new Error('Consulate ID is required')
			}
			return await props.client.getConsulateDetails({
				languageVersion: 1,
				consulateId: String(checkSlotsResult.consulateId)
			})
		},
		enabled: !!checkSlotsResult?.consulateId
	})

	// Open browser when reservation is complete (only once)
	useEffect(() => {
		if (
			reservationResult &&
			checkSlotsResult &&
			consulateDetails &&
			checkSlotsResult.consulateId &&
			checkSlotsResult.serviceType &&
			!browserOpening &&
			!browserError &&
			!browserOpenedRef.current
		) {
			browserOpenedRef.current = true
			setBrowserOpening(true)

			// Save reservation data locally
			saveReservationData({
				reservationResult,
				checkSlotsResult,
				consulateDetails,
				timestamp: new Date().toISOString()
			}).catch(error => {
				console.error('[STORAGE] Failed to save reservation data:', error)
			})

			openReservationForm({
				reservationResult,
				checkSlotsResult,
				consulateDetails,
				headless: false
			})
				.then(() => {
					console.error('[BROWSER] Browser opened successfully')
				})
				.catch(error => {
					console.error('[BROWSER] Error opening browser:', error)
					setBrowserError(String(error))
					browserOpenedRef.current = false // Allow retry on error
				})
				.finally(() => {
					setBrowserOpening(false)
				})
		}
	}, [reservationResult, checkSlotsResult, consulateDetails, browserOpening, browserError])

	if (!reservationResult) {
		return (
			<ink.Box flexDirection='column'>
				<ink.Text color='red'>No reservation result available</ink.Text>
			</ink.Box>
		)
	}

	if (!checkSlotsResult) {
		return (
			<ink.Box flexDirection='column'>
				<ink.Text color='red'>No checkSlots result available</ink.Text>
			</ink.Box>
		)
	}

	return (
		<ink.Box flexDirection='column'>
			<ink.Box marginBottom={1}>
				<ink.Text
					color='green'
					bold
				>
					Reservation created successfully!
				</ink.Text>
			</ink.Box>
			<ink.Box marginTop={1}>
				<ink.Text>Ticket: {reservationResult.ticket}</ink.Text>
			</ink.Box>
			<ink.Box marginTop={1}>
				<ink.Text>Tickets ({reservationResult.tickets.length}):</ink.Text>
				{reservationResult.tickets.map((ticket, index) => (
					<ink.Box
						key={ticket.ticket}
						marginLeft={2}
						marginTop={1}
					>
						<ink.Text>
							{index + 1}. Date: {ticket.date}, Time: {ticket.time || 'N/A'}, Ticket:{' '}
							{ticket.ticket}
						</ink.Text>
					</ink.Box>
				))}
			</ink.Box>
			{reservationResult.verifiedIdentity !== undefined && (
				<ink.Box marginTop={1}>
					<ink.Text>
						Verified Identity:{' '}
						{reservationResult.verifiedIdentity === true
							? 'Yes'
							: reservationResult.verifiedIdentity === false
								? 'No'
								: 'Unknown'}
					</ink.Text>
				</ink.Box>
			)}
			<ink.Box marginTop={1}>
				<ink.Text>
					Is Child Application: {reservationResult.isChildApplication ? 'Yes' : 'No'}
				</ink.Text>
			</ink.Box>
			{browserOpening && (
				<ink.Box marginTop={2}>
					<Spinner label='Opening browser with session storage...' />
				</ink.Box>
			)}
			{browserError && (
				<ink.Box marginTop={2}>
					<ink.Text color='yellow'>Browser error: {browserError}</ink.Text>
				</ink.Box>
			)}
			{!browserOpening && !browserError && (
				<ink.Box marginTop={2}>
					<ink.Text dimColor>Browser opened with session storage injected</ink.Text>
				</ink.Box>
			)}
			<ink.Box marginTop={2}>
				<ink.Text dimColor>Press 'q' to exit or 'r' to start over</ink.Text>
			</ink.Box>
		</ink.Box>
	)
}

function useAppExit(): void {
	const app = ink.useApp()
	const step = useStore(state => state.step)
	const reset = useStore(state => state.reset)

	ink.useInput((input, key) => {
		if (input === 'q' || (key.ctrl && input === 'c')) {
			app.exit()
		} else if (input === 'r' && (step === Step.SlotsDisplay || step === Step.CheckingSlots)) {
			reset()
		}
	})
}

export interface RenderOptions {
	eKonsulat: {
		client: EKonsulatClient
	}

	captcha: {
		solver: CaptchaSolver
	}
}

export function render(options: RenderOptions): ink.Instance {
	return ink.render(
		<App
			eKonsulat={options.eKonsulat}
			captcha={options.captcha}
		/>
	)
}
