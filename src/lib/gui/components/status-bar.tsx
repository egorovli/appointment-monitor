import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

import { useClient } from '../lib/client-context.tsx'

export function StatusBar(): React.ReactNode {
	const client = useClient()
	const [browserState, setBrowserState] = useState<{
		isConnected: boolean
		url: string
		title: string
		isLoading: boolean
	}>({
		isConnected: false,
		url: '',
		title: '',
		isLoading: false
	})
	const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined)

	useEffect(() => {
		const updateStatus = async () => {
			try {
				const state = await client.getBrowserState()
				setBrowserState(state)

				const token = await client.getCaptchaToken()
				setCaptchaToken(token)
			} catch (error) {
				// Silently handle errors
			}
		}

		// Update immediately
		updateStatus()

		// Update every 2 seconds
		const interval = setInterval(updateStatus, 2000)

		return () => {
			clearInterval(interval)
		}
	}, [client])

	const browserStatus = browserState.isConnected ? 'Connected' : 'Disconnected'
	const browserStatusColor = browserState.isConnected ? 'green' : 'red'
	const pageStatus = browserState.isLoading ? 'Loading' : 'Ready'
	const pageStatusColor = browserState.isLoading ? 'yellow' : 'green'
	const captchaStatus = captchaToken ? 'Present' : 'None'
	const captchaStatusColor = captchaToken ? 'green' : 'dim'

	return (
		<Box
			borderTop={true}
			paddingX={1}
			flexDirection='column'
		>
			<Box
				flexDirection='row'
				gap={2}
			>
				<Text>
					<Text dimColor>Browser: </Text>
					<Text color={browserStatusColor}>{browserStatus}</Text>
				</Text>
				<Text>
					<Text dimColor>Page: </Text>
					<Text color={pageStatusColor}>{pageStatus}</Text>
				</Text>
				<Text>
					<Text dimColor>Captcha: </Text>
					<Text color={captchaStatusColor}>{captchaStatus}</Text>
				</Text>
			</Box>
			{browserState.url && (
				<Box marginTop={1}>
					<Text dimColor>
						URL:{' '}
						{browserState.url.length > 60
							? `${browserState.url.substring(0, 57)}...`
							: browserState.url}
					</Text>
				</Box>
			)}
			{captchaToken && (
				<Box marginTop={1}>
					<Text dimColor>
						Token: {captchaToken.length > 40 ? `${captchaToken.substring(0, 37)}...` : captchaToken}
					</Text>
				</Box>
			)}
		</Box>
	)
}
