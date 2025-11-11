import { Text } from 'ink'
import { useEffect, useState } from 'react'

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
	const [frame, setFrame] = useState(0)
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

	useEffect(() => {
		const timer = setInterval(() => {
			setFrame(prev => (prev + 1) % frames.length)
		}, 100)

		return () => {
			clearInterval(timer)
		}
	}, [])

	return (
		<Text color='cyan'>
			{frames[frame]} {message}
		</Text>
	)
}
