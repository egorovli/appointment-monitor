import { Api } from 'grammy'

export interface TelegramConfig {
	botToken: string
	chatId: string | number
}

export interface NotificationMessage {
	operationText: string
	totalAvailable: number
}

export class TelegramNotifierError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'TelegramNotifierError'
	}
}

/**
 * Validates Telegram configuration from environment variables
 */
export function validateTelegramConfig(): TelegramConfig {
	const botToken = Bun.env.TELEGRAM_BOT_TOKEN
	const chatId = Bun.env.TELEGRAM_CHAT_ID

	if (!botToken) {
		throw new TelegramNotifierError('TELEGRAM_BOT_TOKEN environment variable is required')
	}

	if (!chatId) {
		throw new TelegramNotifierError('TELEGRAM_CHAT_ID environment variable is required')
	}

	// Try to parse chatId as number, but also allow string usernames
	const chatIdNum = Number.parseInt(chatId, 10)
	const parsedChatId = Number.isNaN(chatIdNum) ? chatId : chatIdNum

	return {
		botToken,
		chatId: parsedChatId
	}
}

/**
 * Formats a notification message for Telegram
 */
export function formatNotificationMessage(message: NotificationMessage): string {
	const { operationText, totalAvailable } = message
	return `🎉 Available slots found!\n\nOperation: ${operationText}\nAvailable days: ${totalAvailable}`
}

/**
 * Sends a Telegram notification when slots are found
 */
export async function sendTelegramNotification(message: NotificationMessage): Promise<void> {
	const config = validateTelegramConfig()
	const api = new Api(config.botToken)
	const formattedMessage = formatNotificationMessage(message)

	await api.sendMessage(config.chatId, formattedMessage)
}
