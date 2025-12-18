import { QueryClient } from '@tanstack/react-query'

export const client = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2,
			retryDelay: (attemptIndex: number): number => Math.min(1000 * 2 ** attemptIndex, 30000),
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			staleTime: 1000 * 60
		}
	}
})
