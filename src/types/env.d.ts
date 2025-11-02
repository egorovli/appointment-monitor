declare module 'bun' {
	interface Env {
		VERSION?: string
		TELEGRAM_BOT_TOKEN?: string
		TELEGRAM_CHAT_ID?: string
	}
}
