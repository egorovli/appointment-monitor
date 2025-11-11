# Appointment Monitor

A terminal-based application for monitoring and scheduling appointments with the Poznań voivodeship government portal (poznan.uw.gov.pl). Built with Bun, TypeScript, and React (Ink) for an interactive command-line experience.

## Features

- **Interactive Terminal UI**: Navigate through services, operations, dates, and time slots using an intuitive interface
- **Real-time Availability**: Check available appointment dates and time slots
- **Multiple Services**: Support for various government services including:
  - Passport applications and collection
  - ID card applications and collection
  - Driving license exchange
  - Birth certificate requests
- **Browser Integration**: Uses Playwright for web scraping and automation

## Prerequisites

- [Bun](https://bun.sh) (v1.3.2 or later)
- Node.js (for Playwright browser dependencies)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd appointment-monitor

# Install dependencies
bun install

# Install Playwright browsers (if not already installed)
bunx playwright install
```

## Usage

### Running the Application

```bash
# Start the interactive interface
bun run start

# Run with visible browser (non-headless mode)
bun run start -- --no-headless

# View help
bun run start -- --help
```

### Navigation

- Use arrow keys to navigate through options
- Press `Enter` to select
- Press `ESC` to go back or exit
- Press `q` to quit

## Development

### Project Structure

```
src/
├── cmd/              # CLI command definitions
├── lib/
│   ├── gui/          # Ink-based terminal UI components
│   ├── monitor/      # Monitoring and scheduling services
│   └── poznan.uw.gov.pl/  # Portal-specific adapters and API
└── types/            # TypeScript type definitions
```

### Available Scripts

```bash
# Run the application
bun run start

# Lint code
bun run lint

# Fix linting issues automatically
bun run lint:fix

# Run tests
bunx playwright test

# Run tests with UI
bunx playwright test --ui
```

### Code Style

This project uses [Biome](https://biomejs.dev) for formatting and linting. The configuration enforces:

- Tabs for indentation
- Single quotes
- Trailing commas
- Ordered imports
- Strict TypeScript settings

Run `bun run lint:fix` to automatically fix formatting issues.

## Testing

End-to-end tests are written with Playwright and located in the `tests/` directory:

```bash
# Run all tests
bunx playwright test

# Run tests in UI mode
bunx playwright test --ui

# Run specific test file
bunx playwright test tests/example.spec.ts
```

Test artifacts (screenshots, videos) are saved to `playwright/test-results/` on failure.

## Architecture

- **CLI Layer** (`src/cmd/`): Commander-based command definitions
- **GUI Layer** (`src/lib/gui/`): React/Ink components for terminal UI
- **Monitor Layer** (`src/lib/monitor/`): Scheduling and polling services
- **Adapter Layer** (`src/lib/poznan.uw.gov.pl/`): Portal-specific scraping and API adapters

The application follows a layered architecture where UI components delegate side effects to monitor services and adapters, keeping presentation logic separate from business logic.

## Contributing

1. Follow the existing code style (enforced by Biome)
2. Write tests for new features
3. Use conventional commit messages: `<type>: <description>`
4. Ensure all tests pass: `bunx playwright test`
5. Run linting: `bun run lint`

## License

This project is licensed under the MIT License with Commercial Use Attribution. See the [LICENSE.md](LICENSE.md) file for details.

**Summary**: You are free to use, modify, and distribute this software. If you use it commercially or derive financial benefit from it, please provide attribution and buy the author a beer! 🍺

