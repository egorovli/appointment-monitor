import type { Client } from '../../poznan.uw.gov.pl/index.ts'

import { createContext, useContext } from 'react'

const ClientContext = createContext<Client | undefined>(undefined)

export interface ClientProviderProps {
	client: Client
	children: React.ReactNode
}

export function ClientProvider({ client, children }: ClientProviderProps): React.ReactNode {
	return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
}

export function useClient(): Client {
	const client = useContext(ClientContext)

	if (!client) {
		throw new Error('useClient must be used within a ClientProvider')
	}

	return client
}
