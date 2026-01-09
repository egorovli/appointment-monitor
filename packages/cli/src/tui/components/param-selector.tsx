/**
 * Parameter selection component
 * Sequential selection: Country → Consulate → Service → Location → Amount
 */

import type {
	Client as EKonsulatClient,
	Consulate,
	Country,
	Location
} from '../../lib/e-konsulat.gov.pl/index.ts'

import type { AppParams } from '../hooks/use-app-state.ts'

import { Select, Spinner, TextInput } from '@inkjs/ui'
import { useQuery } from '@tanstack/react-query'
import { Box, Text } from 'ink'
import { useState } from 'react'

// Important countries to show first
const IMPORTANT_COUNTRIES = ['RUSSIAN FEDERATION', 'MONTENEGRO', 'UKRAINE', 'BELARUS']

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
	return a.name.localeCompare(b.name)
}

type SelectionStep = 'country' | 'consulate' | 'service' | 'location' | 'amount'

interface Selection {
	countryId?: string
	countryName?: string
	consulateId?: string
	consulateName?: string
	serviceId?: string
	serviceName?: string
	locationId?: string
	locationName?: string
	amount?: number
}

export interface ParamSelectorProps {
	client: EKonsulatClient
	onComplete: (params: AppParams) => void
}

export function ParamSelector({ client, onComplete }: ParamSelectorProps): React.ReactNode {
	const [step, setStep] = useState<SelectionStep>('country')
	const [selection, setSelection] = useState<Selection>({})

	// Fetch countries
	const {
		data: countries,
		isLoading: countriesLoading,
		error: countriesError
	} = useQuery({
		queryKey: ['countries'],
		queryFn: async () => {
			const countries = await client.getCountries()
			return countries.sort(countriesSorter)
		}
	})

	// Fetch services for selected consulate
	const {
		data: services,
		isLoading: servicesLoading,
		error: servicesError
	} = useQuery({
		queryKey: ['services', selection.consulateId],
		queryFn: async () => {
			if (!selection.consulateId) {
				throw new Error('No consulate selected')
			}
			return client.getConsulateServices({ consulateId: selection.consulateId })
		},
		enabled: !!selection.consulateId
	})

	// Get consulates for selected country
	const selectedCountry = countries?.find(c => c.id === selection.countryId)
	const consulates = selectedCountry?.consulates || []

	// Get locations for selected service
	const selectedService = services?.find(s => s.id === selection.serviceId)
	const locations = selectedService?.locations || []

	// Handle amount submission
	const handleAmountSubmit = (value: string) => {
		const amount = Number.parseInt(value, 10)
		if (Number.isNaN(amount) || amount <= 0) {
			return
		}

		// Validate all required fields are present
		const {
			countryId,
			countryName,
			consulateId,
			consulateName,
			serviceId,
			serviceName,
			locationId,
			locationName
		} = selection

		if (
			!countryId ||
			!countryName ||
			!consulateId ||
			!consulateName ||
			!serviceId ||
			!serviceName ||
			!locationId ||
			!locationName
		) {
			return
		}

		const params: AppParams = {
			countryId,
			countryName,
			consulateId,
			consulateName,
			serviceId,
			serviceName,
			locationId,
			locationName,
			amount
		}
		onComplete(params)
	}

	return (
		<Box
			flexDirection='column'
			gap={1}
		>
			<Box>
				<Text bold>Appointment Monitor</Text>
			</Box>

			{/* Show current selections */}
			{selection.countryName && <Text dimColor>Country: {selection.countryName}</Text>}
			{selection.consulateName && <Text dimColor>Consulate: {selection.consulateName}</Text>}
			{selection.serviceName && <Text dimColor>Service: {selection.serviceName}</Text>}
			{selection.locationName && <Text dimColor>Location: {selection.locationName}</Text>}

			{/* Country selection */}
			{step === 'country' && (
				<Box flexDirection='column'>
					{countriesLoading && <Spinner label='Loading countries...' />}
					{countriesError && <Text color='red'>Error: {String(countriesError)}</Text>}
					{countries && countries.length > 0 && (
						<>
							<Text>Select country:</Text>
							<Select
								options={countries.map(c => ({ label: c.name, value: c.id }))}
								onChange={value => {
									const country = countries.find(c => c.id === value)
									setSelection({
										countryId: value,
										countryName: country?.name
									})
									setStep('consulate')
								}}
							/>
						</>
					)}
				</Box>
			)}

			{/* Consulate selection */}
			{step === 'consulate' && (
				<Box flexDirection='column'>
					{consulates.length === 0 && <Text color='red'>No consulates available</Text>}
					{consulates.length > 0 && (
						<>
							<Text>Select consulate:</Text>
							<Select
								options={consulates.map((c: Consulate) => ({ label: c.name, value: c.id }))}
								onChange={value => {
									const consulate = consulates.find((c: Consulate) => c.id === value)
									setSelection(prev => ({
										...prev,
										consulateId: value,
										consulateName: consulate?.name
									}))
									setStep('service')
								}}
							/>
						</>
					)}
				</Box>
			)}

			{/* Service selection */}
			{step === 'service' && (
				<Box flexDirection='column'>
					{servicesLoading && <Spinner label='Loading services...' />}
					{servicesError && <Text color='red'>Error: {String(servicesError)}</Text>}
					{services && services.length === 0 && <Text color='red'>No services available</Text>}
					{services && services.length > 0 && (
						<>
							<Text>Select service:</Text>
							<Select
								options={services.map(s => ({ label: s.name, value: s.id }))}
								onChange={value => {
									const service = services.find(s => s.id === value)
									setSelection(prev => ({
										...prev,
										serviceId: value,
										serviceName: service?.name
									}))
									setStep('location')
								}}
							/>
						</>
					)}
				</Box>
			)}

			{/* Location selection */}
			{step === 'location' && (
				<Box flexDirection='column'>
					{locations.length === 0 && <Text color='red'>No locations available</Text>}
					{locations.length > 0 && (
						<>
							<Text>Select location:</Text>
							<Select
								options={locations.map((l: Location) => ({ label: l.name, value: l.id }))}
								onChange={value => {
									const location = locations.find((l: Location) => l.id === value)
									setSelection(prev => ({
										...prev,
										locationId: value,
										locationName: location?.name
									}))
									setStep('amount')
								}}
							/>
						</>
					)}
				</Box>
			)}

			{/* Amount input */}
			{step === 'amount' && (
				<Box flexDirection='column'>
					<Text>Number of people:</Text>
					<TextInput
						placeholder='Enter number...'
						defaultValue='1'
						onSubmit={handleAmountSubmit}
					/>
					<Text dimColor>Press Enter to start monitoring</Text>
				</Box>
			)}
		</Box>
	)
}
