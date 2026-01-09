/**
 * Application state management using React Context + useReducer
 * Simplified from Zustand for clearer state flow
 */

import type {
	CheckSlotsResult,
	ConsulateDetails,
	CreateReservationResult,
	Slot
} from '../../lib/e-konsulat.gov.pl/index.ts'

import type { ErrorLog } from '../lib/error-classifier.ts'
import type { ReactNode } from 'react'

import { createContext, useContext, useReducer } from 'react'

// Application phases
export type AppPhase = 'params' | 'searching' | 'booking' | 'success'

// User-selected parameters
export interface AppParams {
	countryId: string
	countryName: string
	consulateId: string
	consulateName: string
	serviceId: string
	serviceName: string
	locationId: string
	locationName: string
	amount: number
}

// Slot search state
export interface SearchState {
	isRunning: boolean
	attempts: number
	lastAttempt: Date | undefined
	slots: Slot[]
	currentToken: string | undefined
	checkSlotsResult: CheckSlotsResult | undefined
	errors: ErrorLog[]
}

// Reservation state
export interface ReservationState {
	isRunning: boolean
	attempts: number
	currentSlotIndex: number
	result: CreateReservationResult | undefined
	consulateDetails: ConsulateDetails | undefined
	errors: ErrorLog[]
}

// Stats tracking
export interface StatsState {
	startTime: Date | undefined
	captchaAttempts: number
	captchaFailures: number
}

// Complete application state
export interface AppState {
	phase: AppPhase
	params: AppParams | undefined
	search: SearchState
	reservation: ReservationState
	stats: StatsState
}

// Action types
export type AppAction =
	| { type: 'SET_PARAMS'; params: AppParams }
	| { type: 'START_SEARCH' }
	| { type: 'UPDATE_SEARCH'; slots: Slot[]; token: string; checkSlotsResult: CheckSlotsResult }
	| { type: 'INCREMENT_SEARCH_ATTEMPT' }
	| { type: 'LOG_SEARCH_ERROR'; error: ErrorLog }
	| { type: 'START_RESERVATION'; consulateDetails: ConsulateDetails }
	| { type: 'INCREMENT_RESERVATION_ATTEMPT' }
	| { type: 'TRY_NEXT_SLOT' }
	| { type: 'LOG_RESERVATION_ERROR'; error: ErrorLog }
	| { type: 'RESERVATION_SUCCESS'; result: CreateReservationResult }
	| { type: 'INCREMENT_CAPTCHA_ATTEMPT' }
	| { type: 'INCREMENT_CAPTCHA_FAILURE' }
	| { type: 'STOP_ALL' }
	| { type: 'RESET' }

// Initial state
const initialSearchState: SearchState = {
	isRunning: false,
	attempts: 0,
	lastAttempt: undefined,
	slots: [],
	currentToken: undefined,
	checkSlotsResult: undefined,
	errors: []
}

const initialReservationState: ReservationState = {
	isRunning: false,
	attempts: 0,
	currentSlotIndex: 0,
	result: undefined,
	consulateDetails: undefined,
	errors: []
}

const initialStatsState: StatsState = {
	startTime: undefined,
	captchaAttempts: 0,
	captchaFailures: 0
}

const initialState: AppState = {
	phase: 'params',
	params: undefined,
	search: initialSearchState,
	reservation: initialReservationState,
	stats: initialStatsState
}

function countAvailableSlots(slots: Slot[]): number {
	return slots.filter(slot => Boolean(slot.date)).length
}

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case 'SET_PARAMS':
			return {
				...state,
				params: action.params
			}

		case 'START_SEARCH':
			return {
				...state,
				phase: 'searching',
				search: {
					...state.search,
					isRunning: true,
					attempts: 0,
					lastAttempt: undefined,
					slots: [],
					errors: []
				},
				stats: {
					...state.stats,
					startTime: state.stats.startTime || new Date()
				}
			}

		case 'UPDATE_SEARCH': {
			// Normalize reservation slot index when slot list or token changes
			const slotCount = countAvailableSlots(action.slots)
			const hasNewToken = state.search.currentToken !== action.token
			const nextSlotIndex =
				slotCount === 0
					? 0
					: hasNewToken
						? 0
						: Math.min(state.reservation.currentSlotIndex, slotCount - 1)

			return {
				...state,
				search: {
					...state.search,
					slots: action.slots,
					currentToken: action.token,
					checkSlotsResult: action.checkSlotsResult,
					lastAttempt: new Date()
				},
				reservation: {
					...state.reservation,
					currentSlotIndex: nextSlotIndex
				}
			}
		}

		case 'INCREMENT_SEARCH_ATTEMPT':
			return {
				...state,
				search: {
					...state.search,
					attempts: state.search.attempts + 1,
					lastAttempt: new Date()
				}
			}

		case 'LOG_SEARCH_ERROR':
			return {
				...state,
				search: {
					...state.search,
					errors: [...state.search.errors, action.error]
				},
				stats: {
					...state.stats,
					captchaFailures:
						action.error.type === 'captcha'
							? state.stats.captchaFailures + 1
							: state.stats.captchaFailures
				}
			}

		case 'START_RESERVATION':
			return {
				...state,
				phase: 'booking',
				reservation: {
					...state.reservation,
					isRunning: true,
					attempts: 0,
					currentSlotIndex: 0,
					consulateDetails: action.consulateDetails,
					errors: []
				}
			}

		case 'INCREMENT_RESERVATION_ATTEMPT':
			return {
				...state,
				reservation: {
					...state.reservation,
					attempts: state.reservation.attempts + 1
				}
			}

		case 'TRY_NEXT_SLOT': {
			const slotCount = countAvailableSlots(state.search.slots)
			const nextIndex = slotCount > 0 ? (state.reservation.currentSlotIndex + 1) % slotCount : 0

			return {
				...state,
				reservation: {
					...state.reservation,
					currentSlotIndex: nextIndex
				}
			}
		}

		case 'LOG_RESERVATION_ERROR':
			return {
				...state,
				reservation: {
					...state.reservation,
					errors: [...state.reservation.errors, action.error]
				},
				stats: {
					...state.stats,
					captchaFailures:
						action.error.type === 'captcha'
							? state.stats.captchaFailures + 1
							: state.stats.captchaFailures
				}
			}

		case 'INCREMENT_CAPTCHA_ATTEMPT':
			return {
				...state,
				stats: {
					...state.stats,
					captchaAttempts: state.stats.captchaAttempts + 1
				}
			}

		case 'INCREMENT_CAPTCHA_FAILURE':
			return {
				...state,
				stats: {
					...state.stats,
					captchaFailures: state.stats.captchaFailures + 1
				}
			}

		case 'RESERVATION_SUCCESS':
			// CRITICAL: Ensure all loops stop immediately
			return {
				...state,
				phase: 'success',
				search: {
					...state.search,
					isRunning: false
				},
				reservation: {
					...state.reservation,
					isRunning: false,
					result: action.result
				}
			}

		case 'STOP_ALL':
			return {
				...state,
				search: {
					...state.search,
					isRunning: false
				},
				reservation: {
					...state.reservation,
					isRunning: false
				}
			}

		case 'RESET':
			return {
				...initialState,
				stats: initialStatsState
			}

		default:
			return state
	}
}

// Context
interface AppContextValue {
	state: AppState
	dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

// Provider component
export interface AppProviderProps {
	children: ReactNode
}

export function AppProvider({ children }: AppProviderProps): React.ReactNode {
	const [state, dispatch] = useReducer(appReducer, initialState)

	return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

// Hook to use app state
export function useAppState(): AppContextValue {
	const context = useContext(AppContext)
	if (!context) {
		throw new Error('useAppState must be used within AppProvider')
	}
	return context
}

// Convenience hooks for specific state slices
export function usePhase(): AppPhase {
	const { state } = useAppState()
	return state.phase
}

export function useParams(): AppParams | undefined {
	const { state } = useAppState()
	return state.params
}

export function useSearchState(): SearchState {
	const { state } = useAppState()
	return state.search
}

export function useReservationState(): ReservationState {
	const { state } = useAppState()
	return state.reservation
}
