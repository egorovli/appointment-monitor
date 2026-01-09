import type { Client } from './client.ts'
import type { SimulationClient } from './simulation-client.ts'

export * from './client.ts'
export { SimulationClient } from './simulation-client.ts'
export type { SimulationConfig } from './simulation-client.ts'

export type EKonsulatClient = Client | SimulationClient
