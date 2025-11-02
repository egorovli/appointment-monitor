import type { InjectionKey } from './injection-key.enum.ts'

/**
 * Maps InjectionKey to implementation class
 */
const KEY_TO_CLASS_MAP: Partial<Record<InjectionKey, unknown>> = {}

export { KEY_TO_CLASS_MAP }
