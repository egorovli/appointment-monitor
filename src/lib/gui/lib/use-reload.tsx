import { useInput } from 'ink'
import { useCallback } from 'react'

import { useClient } from './client-context.tsx'

/**
 * Hook to add reload browser functionality to any component.
 * Press 'r' or 'R' to reload the browser page.
 */
export function useReload(): void {
	const client = useClient()

	const handleReload = useCallback(async () => {
		try {
			await client.reload()
		} catch (error) {
			// Silently handle errors
		}
	}, [client])

	useInput((input, key) => {
		if (input === 'r' || input === 'R') {
			handleReload()
		}
	})
}
