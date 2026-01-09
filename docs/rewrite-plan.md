# Appointment Monitor Rewrite Plan

## Overview

Rewrite the TUI application from scratch with:
- Simpler state management (React state + context instead of Zustand)
- React Query (TanStack Query) for all API calls with robust retry/backoff
- Minimal Ink UI showing real-time progress and stats
- Parallel processes: continuous slot search + automatic reservation attempts
- Clear session data output for browser resumption

## Current State Analysis

**What works well (keep):**
- API client (`packages/cli/src/lib/e-konsulat.gov.pl/client.ts`) - well-structured
- CAPTCHA solver (`packages/cli/src/lib/captcha/solver.ts`) - TensorFlow-based
- Session injection logic (`packages/cli/src/lib/browser/session-injection.ts`)
- React Query client configuration

**What needs rewriting:**
- TUI (`packages/cli/src/tui/index.tsx`) - currently 936 lines with Zustand, step-based navigation
- State management approach - simplify dramatically

## Architecture

### Application Phases

```
Phase 1: Parameter Selection
├── Country → Consulate → Service → Location → Amount
└── Simple sequential prompts with @inkjs/ui Select

Phase 2: Slot Search (Process #1)
├── Infinite loop: CAPTCHA → checkSlots → retry
├── Exponential backoff with jitter on rate limit errors
├── Real-time stats: attempts, errors, last check time
└── Continues running even after slots found

Phase 3: Reservation (Process #2 - parallel with #1)
├── Triggered when slots are found
├── Try first available slot
├── On failure: try next slot immediately
├── On success: output session data and stop
└── Keeps retrying as long as slots exist

Phase 4: Success Output
├── Stop all search/reservation loops
├── Display reservation tickets
├── Display form URL (clickable in terminal)
├── Display console script to paste in browser
├── Auto-copy script to clipboard
├── Keep visible until user exits (Ctrl+C)
```

### State Management

Use React Context + `useReducer` for simple, predictable state:

```typescript
interface AppState {
  phase: 'params' | 'searching' | 'booking' | 'success'

  // Parameters (set once during Phase 1)
  params: {
    countryId: string
    consulateId: string
    serviceId: string
    locationId: string
    amount: number
  } | undefined

  // Slot search state (updated continuously)
  search: {
    isRunning: boolean
    attempts: number
    lastAttempt: Date | undefined
    slots: Slot[]
    currentToken: string | undefined
    errors: ErrorLog[]
  }

  // Reservation state
  reservation: {
    isRunning: boolean
    attempts: number
    currentSlotIndex: number
    result: CreateReservationResult | undefined
    checkSlotsResult: CheckSlotsResult | undefined
    errors: ErrorLog[]
  }
}

interface ErrorLog {
  timestamp: Date
  type: 'rate_limit' | 'network' | 'timeout' | 'api' | 'captcha' | 'unknown'
  message: string
  context?: Record<string, unknown>
}
```

### React Query Configuration

```typescript
// For slot checking - aggressive retry with backoff
const slotCheckMutation = useMutation({
  mutationFn: async ({ locationId, amount, token }) => {
    return client.checkSlots({ locationId, amount, token })
  },
  retry: (failureCount, error) => {
    // Don't retry hard rate limits (24 hour ban)
    if (isHardRateLimit(error)) return false
    // Always retry soft errors
    return true
  },
  retryDelay: (attempt, error) => {
    if (isSoftRateLimit(error)) {
      // Soft rate limit: wait 2-5 seconds with jitter
      return 2000 + Math.random() * 3000
    }
    // Other errors: quick retry
    return 500
  }
})

// For reservation - quick retry, try different slots
const reservationMutation = useMutation({
  mutationFn: async ({ date, locationId, token, amount }) => {
    return client.createReservation({ date, locationId, token, amount })
  },
  retry: 2,
  retryDelay: 200
})
```

### Error Classification

Based on real API responses:

**Two types of rate limits:**
1. **Hard rate limit (24 hours)** - `LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY` - After booking too many slots from one IP. No point retrying, should inform user.
2. **Soft rate limit (seconds)** - For checking slots too frequently. Resolves in a few seconds. Should retry with small backoff.

```typescript
// Known API error reasons (from response body)
type ApiErrorReason =
  | 'LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY'  // HARD rate limit - 24 hours (HTTP 400)
  | 'BRAK_WOLNYCH_TERMINOW'            // No available slots
  | 'NIEPRAWIDLOWY_TOKEN'              // Invalid token
  | 'TERMIN_ZAJETY'                    // Slot already taken
  | 'SLOT_UNAVAILABLE'                 // Our custom: bilet=null on HTTP 200
  | string                              // Other unknown reasons

type RateLimitType = 'hard' | 'soft'

function classifyRateLimit(error: ApiError): RateLimitType {
  if (error.reason === 'LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY') {
    return 'hard'  // 24 hour ban, don't retry
  }
  return 'soft'  // Few seconds, retry with small backoff
}

interface ApiError {
  reason: ApiErrorReason
}

// Reservation response can be success (with bilet) or soft-failure (bilet=null)
function isReservationSuccess(response: ReservationResponse): boolean {
  return response.bilet !== null && response.bilet !== undefined
}

function classifyError(error: Error, response?: Response): ErrorLog['type'] {
  // Check for specific API error reasons
  if (response?.status === 400) {
    // Parse response body for reason field
    // {"reason":"LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY"}
    return 'rate_limit'  // or other based on reason
  }

  const message = error.message.toLowerCase()

  if (message.includes('429') || message.includes('rate') || message.includes('limit')) {
    return 'rate_limit'
  }
  if (message.includes('timeout')) {
    return 'timeout'
  }
  if (message.includes('captcha')) {
    return 'captcha'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'network'
  }
  if (message.includes('http')) {
    return 'api'
  }
  return 'unknown'
}
```

**Important**: The API returns HTTP 400 with `{"reason":"LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY"}` for IP rate limits. Need to parse response body to detect this.

## File Structure

```
packages/cli/src/
├── index.ts                    # Entry point (keep)
├── cmd/
│   └── run.ts                  # CLI command (minimal changes)
├── tui/
│   ├── index.tsx               # Main App component (rewrite)
│   ├── components/
│   │   ├── param-selector.tsx  # Phase 1: parameter selection UI
│   │   ├── slot-monitor.tsx    # Phase 2/3: monitoring display
│   │   └── success-display.tsx # Phase 4: reservation result
│   ├── hooks/
│   │   ├── use-slot-search.ts  # Infinite slot search loop
│   │   ├── use-reservation.ts  # Reservation booking loop
│   │   └── use-app-state.ts    # State management context
│   └── lib/
│       ├── error-classifier.ts # Error type detection
│       └── retry-config.ts     # Retry/backoff configuration
├── lib/
│   ├── e-konsulat.gov.pl/      # API client (keep as-is)
│   ├── captcha/                # CAPTCHA solver (keep as-is)
│   ├── browser/                # Session injection (keep as-is)
│   └── query/                  # React Query client (enhance)
```

## UI Design

### Phase 1: Parameter Selection
```
┌─────────────────────────────────────┐
│ Appointment Monitor                 │
├─────────────────────────────────────┤
│ Country: [Select...]                │
│ Consulate: [Select...]              │
│ Service: [Select...]                │
│ Location: [Select...]               │
│ People: [1]                         │
│                                     │
│ Press Enter to start monitoring     │
└─────────────────────────────────────┘
```

### Phase 2/3: Monitoring
```
┌─────────────────────────────────────┐
│ Monitoring: Konsulat RP w Moskwie   │
│ Service: Wiza Krajowa               │
├─────────────────────────────────────┤
│ SLOT SEARCH                         │
│ ● Running  Attempts: 142            │
│   Last: 12:34:56  Slots: 0          │
│   Errors: 3 (2 rate limit, 1 timeout)│
├─────────────────────────────────────┤
│ RESERVATION                         │
│ ○ Waiting for slots...              │
├─────────────────────────────────────┤
│ Press Ctrl+C to stop                │
└─────────────────────────────────────┘
```

### Phase 4: Success
```
┌──────────────────────────────────────────────────────────────┐
│ ✓ RESERVATION SUCCESSFUL!                                    │
├──────────────────────────────────────────────────────────────┤
│ Ticket: ABC123XYZ                                            │
│ Date: 2024-03-15  Time: 10:30                                │
├──────────────────────────────────────────────────────────────┤
│ 1. Open in browser:                                          │
│    https://secure.e-konsulat.gov.pl/placowki/139/...         │
│                                                              │
│ 2. Paste in browser console (F12) - COPIED TO CLIPBOARD:     │
│ ──────────────────────────────────────────────────────────── │
│ sessionStorage.setItem('NV_RESERVATION_DATA_CONTEXT', ...);  │
│ sessionStorage.setItem('NV_TICKETS', ...);                   │
│ location.reload();                                           │
│ ──────────────────────────────────────────────────────────── │
│                                                              │
│ 3. Fill out the form after page reloads                      │
├──────────────────────────────────────────────────────────────┤
│ Saved: .reservations/reservation-1234567890.json             │
│ Press Ctrl+C to exit                                         │
└──────────────────────────────────────────────────────────────┘
```

## Session Data Output

Since browser automation with session injection isn't possible (OS/browser limitation), we output:

1. **Form URL** - Direct link to open in browser
2. **Console Script** - JavaScript to paste in browser console to set sessionStorage

### Output Format

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ RESERVATION SUCCESSFUL!                                   │
├─────────────────────────────────────────────────────────────┤
│ Ticket: ABC123XYZ                                           │
│ Date: 2024-03-15                                            │
│ Time: 10:30                                                 │
├─────────────────────────────────────────────────────────────┤
│ STEP 1: Open this URL in your browser:                      │
│ https://secure.e-konsulat.gov.pl/placowki/139/wiza-krajowa/formularz/nowy
│                                                             │
│ STEP 2: Open browser console (F12 → Console) and paste:     │
│ ─────────────────────────────────────────────────────────── │
│ sessionStorage.setItem('NV_RESERVATION_DATA_CONTEXT',       │
│   '{"dzienWizyty":"2024-03-15","czas":"...","adres":{...}}');│
│ sessionStorage.setItem('NV_TICKETS',                        │
│   '{"ticketsList":[...],"visitorIndex":0}');                │
│ location.reload();                                          │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ STEP 3: After page reloads, fill out the form               │
├─────────────────────────────────────────────────────────────┤
│ Data saved to: .reservations/reservation-1234567890.json    │
│ Press Ctrl+C to exit                                        │
└─────────────────────────────────────────────────────────────┘
```

### Console Script Generation

```typescript
function generateConsoleScript(sessionData: SessionStorageData): string {
  const nvReservation = JSON.stringify(sessionData.NV_RESERVATION_DATA_CONTEXT)
  const nvTickets = JSON.stringify(sessionData.NV_TICKETS)
  const institution = sessionData.INSTITUTION_CONTEXT_DATA
    ? JSON.stringify(sessionData.INSTITUTION_CONTEXT_DATA)
    : null

  let script = `// Paste this in browser console on the form page
sessionStorage.setItem('NV_RESERVATION_DATA_CONTEXT', '${nvReservation}');
sessionStorage.setItem('NV_TICKETS', '${nvTickets}');`

  if (institution) {
    script += `\nsessionStorage.setItem('INSTITUTION_CONTEXT_DATA', '${institution}');`
  }

  script += `\nlocation.reload();`

  return script
}
```

### Form URL Construction

```typescript
function buildFormUrl(checkSlotsResult: CheckSlotsResult): string {
  const { consulateId, serviceType } = checkSlotsResult
  const servicePath = serviceType === 1 ? 'wiza-krajowa' : 'wiza-schengen'
  return `https://secure.e-konsulat.gov.pl/placowki/${consulateId}/${servicePath}/formularz/nowy`
}
```

## Implementation Steps

### Step 1: Create new file structure
- Create `tui/components/`, `tui/hooks/`, `tui/lib/` directories
- Keep existing lib files untouched

### Step 2: Implement state management
- Create `use-app-state.ts` with React Context + useReducer
- Define actions: SET_PARAMS, START_SEARCH, UPDATE_SLOTS, START_RESERVATION, RESERVATION_SUCCESS, LOG_ERROR

### Step 3: Implement error handling utilities
- Create `error-classifier.ts` for error type detection
- Create `retry-config.ts` for centralized retry configuration

### Step 4: Implement hooks
- `use-slot-search.ts`: Infinite loop with CAPTCHA → checkSlots → retry
- `use-reservation.ts`: Try slots sequentially until success or exhausted

### Step 5: Build UI components
- `param-selector.tsx`: Sequential parameter selection
- `slot-monitor.tsx`: Real-time stats display
- `success-display.tsx`: Reservation result with session data

### Step 6: Wire up main App
- Rewrite `tui/index.tsx` to use new components and hooks
- Implement phase transitions

### Step 7: Test and verify
- Test parameter selection flow
- Test slot search with mock responses
- Test reservation flow
- Verify session data output format

## Key Technical Decisions

1. **No XState** - Use simple React Context + useReducer. The current code uses Zustand, but even that is overkill for this use case.

2. **React Query for mutations** - Use `useMutation` with custom retry logic, not `useQuery`. Slot checking is a mutation (POST with CAPTCHA token).

3. **Parallel processes via hooks** - Two independent hooks running in the same component, sharing state via context.

4. **Error logging** - Store all errors with timestamps and types for analysis. Display summary in UI, full log available in saved file.

5. **Session data always visible** - Once reservation succeeds, the data stays on screen. Also saved to `.reservations/` directory.

## Files to Modify

| File | Action |
|------|--------|
| `packages/cli/src/tui/index.tsx` | Rewrite completely |
| `packages/cli/src/tui/components/*.tsx` | Create new |
| `packages/cli/src/tui/hooks/*.ts` | Create new |
| `packages/cli/src/tui/lib/*.ts` | Create new |
| `packages/cli/src/lib/query/client.ts` | Enhance retry config |

## Verification

1. Run the app and complete parameter selection
2. Observe slot search running with real-time stats
3. Verify error handling and backoff behavior (can test with network throttling)
4. When slots found, verify reservation attempts
5. On success, verify session data is displayed and saved
6. Verify data format matches what `openReservationForm()` expects

## Decisions Made

- **Browser**: Output URL + console script (no auto-open, OS/browser limitation)
- **Notifications**: Silent operation, no sounds or notifications
- **Exit behavior**: Stay running after success, but stop all searches

## Real API Data Flow (from HAR captures)

### Check Slots Response
```json
{
  "idLokalizacji": 382,
  "idPlacowki": 139,           // consulateId - needed for form URL
  "rodzajUslugi": 1,           // 1 = wiza-krajowa, 2 = wiza-schengen
  "tabelaDni": ["2026-01-13", "2026-01-15", ...],  // Available dates (strings)
  "token": "27a84e01-ce67-4a70-ab80-b3b558c44eb0", // Required for reservation
  "identityToken": null
}
```

### Create Reservation Request
```json
{
  "data": "2026-02-26",           // Selected date from tabelaDni
  "id_lokalizacji": 382,
  "id_wersji_jezykowej": 1,
  "token": "27a84e01-ce67-4a70-ab80-b3b558c44eb0",  // From checkSlots
  "liczba_osob": 2,
  "tylko_dzieci": false
}
```

### Create Reservation Response (Success)
```json
{
  "bilet": "DAAAAE7A...",         // Main ticket
  "listaBiletow": [
    {
      "bilet": "DAAAAE7A...",
      "data": "2026-02-26",
      "godzina": "",              // Time (often empty)
      "zweryfikowanaTozsamosc": null,
      "wniosekDziecka": false     // Child application flag
    }
  ],
  "zweryfikowanaTozsamosc": null,
  "wniosekDziecka": false
}
```

### Create Reservation Response (Slot Unavailable - HTTP 200!)
When the slot is no longer available (taken by someone else, or not enough capacity for the requested number of people), the API returns HTTP 200 but with all null values:
```json
{
  "bilet": null,
  "data": null,
  "godzina": null,
  "zweryfikowanaTozsamosc": null,
  "wniosekDziecka": null
}
```
**Important**: This is NOT an HTTP error - it's a "soft failure" that needs to be detected by checking if `bilet` is null.

### Create Reservation Response (Rate Limit Error - HTTP 400)
```json
{
  "reason": "LIMIT_Z_JEDNEGO_IP_PRZEKROCZONY"
}
```

### Session Storage Keys (for browser injection)

**NV_RESERVATION_DATA_CONTEXT**:
```json
{
  "dzienWizyty": "2026-02-26",
  "czas": "2026-01-09T10:55:46.943Z",
  "adres": {
    "adres11": "Rruga e Bogdanëve 50",
    "adres12": "1001 Tirana"
  },
  "tylko_dzieci": false
}
```

**NV_TICKETS**:
```json
{
  "ticketsList": [
    {"bilet": "...", "data": "2026-02-26", "godzina": "", "wniosekDziecka": false}
  ],
  "visitorIndex": 0
}
```

**INSTITUTION_CONTEXT_DATA** (from getConsulateDetails):
```json
{
  "nazwaPlacowki": "Sydney",
  "nazwaKraju": "AUSTRALIA",
  "informacje": "<p>...HTML content with consulate info...</p>",  // Optional
  "dostepneUslugi": {
    "wizaKrajowa": true,
    "wizaKrajowa_WYPELNIJ": false,
    "wizaSchengen": true,
    // ... more service flags
  },
  "adresPlacowki": {
    "adres11": "10 Trelawney Street",
    "adres12": "Woollahra NSW 2025",
    "adres21": "",
    "adres22": ""
  },
  "emaile": {
    "spotkanieZKonsulem": "sydney.kg@msz.gov.pl",
    "sprawyPaszportowe": "sydney.visa.passport@msz.gov.pl",
    // ... more emails
  }
}
```

### Key Observations from Real Data

1. **Slots are just dates** - `tabelaDni` contains date strings like `"2026-03-17"`, no time info
2. **Time is always empty** - `godzina` field is empty string `""` in all responses
3. **Multiple tickets** - When `liczba_osob > 1`, response includes multiple tickets in `listaBiletow`
4. **Child flag** - `wniosekDziecka` distinguishes adult vs child applications
5. **Token reuse** - The `token` from checkSlots is used directly in createReservation

## Dependencies to Add

- `clipboardy` - For auto-copying console script to clipboard on success

## Future Considerations

1. **Multiple locations**: Could monitor multiple locations simultaneously
2. **Consulate details fetch**: Currently we fetch `getConsulateDetails()` for session data - may be able to simplify if not all fields are needed
