import type { IdGenerator } from '../../core/services/id-generator.ts'
import type { BrowserPort, NotificationPort } from '../../domain/ports/slot-ports.port.ts'
import type { CheckSlotsUseCase } from '../../application/use-cases/check-slots.use-case.ts'
import type { MonitorSlotsUseCase } from '../../application/use-cases/monitor-slots.use-case.ts'

import { InjectionKey } from './injection-key.enum.ts'

/**
 * BindingMap - Type-safe mapping of InjectionKeys to their implementations
 *
 * This interface defines the contract for all container bindings, providing
 * compile-time type safety for bindings, retrievals, and injections.
 *
 * @see https://inversify.io/docs/ecosystem/strongly-typed/
 */
export interface BindingMap {
	// Core services
	[InjectionKey.IdGenerator]: IdGenerator

	// Domain ports
	[InjectionKey.BrowserPort]: BrowserPort
	[InjectionKey.NotificationPort]: NotificationPort

	// Application use cases
	[InjectionKey.CheckSlotsUseCase]: CheckSlotsUseCase
	[InjectionKey.MonitorSlotsUseCase]: MonitorSlotsUseCase
}
