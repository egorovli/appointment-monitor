# Appointment Monitor

CLI tool for monitoring appointment slot availability on government websites using browser automation. Features continuous monitoring with Telegram notifications and clean architecture design.

## Features

- **Automated Slot Checking**: Monitors appointment availability using Playwright browser automation
- **Telegram Notifications**: Instant alerts when slots become available
- **Clean Architecture**: Domain-driven design with dependency injection
- **CLI Interface**: Simple command-line interface for one-time checks or continuous monitoring

## Installation

```bash
bun install
```

## Usage

### Single Check

```bash
bun run start run --operation "Obywatelstwo polskie"
```

### Continuous Monitoring

```bash
bun run start watch --operation "Obywatelstwo polskie" --interval 60
```

## Configuration

Set environment variables for Telegram notifications:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `TELEGRAM_CHAT_ID`: Your Telegram chat ID

## Technology Stack

- **Runtime**: Bun
- **Browser Automation**: Playwright
- **Notifications**: Telegram (Grammy)
- **Architecture**: Clean Architecture with TypeScript
- **DI**: InversifyJS with type-safe bindings

## License

Private repository
