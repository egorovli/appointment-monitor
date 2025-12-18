# Session Storage Analysis for Reservation Persistence

## Overview

After creating a reservation via `/api/rezerwacja-wizyt-wizowych/rezerwacje`, the e-konsulat frontend stores specific values in browser session storage to preserve the reservation state across page refreshes. This document analyzes the required session storage keys and how to construct them from API responses.

## Required Session Storage Keys

### 1. `NV_RESERVATION_DATA_CONTEXT`

**Purpose**: Stores reservation context data for national visa (`wiza-krajowa`) applications.

**Structure**:
```json
{
  "dzienWizyty": "2026-01-15",
  "czas": "2025-12-18T18:12:04.246Z",
  "adres": {
    "adres11": "Kozaračka 79",
    "adres12": "81 000 Podgorica"
  },
  "tylko_dzieci": false
}
```

**Field Mapping**:
- `dzienWizyty`: **From reservation request** - The `data` field (date in YYYY-MM-DD format)
- `czas`: **Generated** - ISO 8601 timestamp of when the reservation was created (e.g., `new Date().toISOString()`)
- `adres`: **From consulate data** - Address information from the consulate/location
  - `adres11`: Street address (e.g., "Kozaračka 79")
  - `adres12`: Postal code and city (e.g., "81 000 Podgorica")
- `tylko_dzieci`: **From reservation request** - The `tylko_dzieci` field (boolean, default: `false`)

**Data Sources**:
- Reservation request: `date` → `dzienWizyty`
- Reservation request: `onlyChildren` → `tylko_dzieci`
- Current timestamp: `new Date().toISOString()` → `czas`
- Consulate address: **Needs to be fetched** (see `INSTITUTION_CONTEXT_DATA` below)

---

### 2. `NV_TICKETS`

**Purpose**: Stores ticket information from the reservation response.

**Structure**:
```json
{
  "ticketsList": [
    {
      "bilet": "DAAAAAytNGHsH/5N9QvMoxAAAAA7odWt9ZpjtJ2suejck8LmUibZj7zXn8jlutBdl+TL9YamEJzpdByXBY2mzQ22GoCgd56YuQTtPqOeBV7Zyc+UUB0e6/aeu2VrWWUYNvs538vNh1mV6hJ04WZ1P8l5iAFVvxazuVjxay3T0SmzC3a/nBx+ZL44ZIRydO3al8CTVb3IJPi6iW8P+jOraw9Nf+gwJW/vDCNm9Kw+U3PMT1kH5WeW4tqIwcP2Ha/LOqD9PQ4AO62G+Req7DgnRwI0wzEBfd4kq6mdS/V+wwFYu40mv8ApNVIwuCNZYGUO1Bxbq82QlCC409oVYZINJLciKXYea7sDaezEC53EMTJRkBGiTjYAxFkDil8oGy0mAd793kE7PxBA98EV6pIgds+6r6sIEt9mirLDN5m4vszaSgtYiBr2NB/1FD9ChS3zqsJ/8F2GaLvsnQQ25tf9LpCky1vpRrmdqWWEDF1H6WShf8iTjtpvaPRupMgt0qohZ06YKaaEFf3YQ/4dgExfMzFVywTz20ljkjOAgYHESWyMYTjr1tqsZuug1rk5kXQXZP8i5QJyyER1pXhyqAUZ5fch/w==",
      "data": "2026-01-15",
      "godzina": "",
      "wniosekDziecka": false
    }
  ],
  "visitorIndex": 0
}
```

**Field Mapping**:
- `ticketsList`: **From reservation response** - Maps directly from `listaBiletow` array
  - Each ticket object contains:
    - `bilet`: Ticket string (from `listaBiletow[].bilet`)
    - `data`: Date string (from `listaBiletow[].data`)
    - `godzina`: Time string (from `listaBiletow[].godzina`, may be empty)
    - `wniosekDziecka`: Boolean (from `listaBiletow[].wniosekDziecka`)
- `visitorIndex`: **Initialized** - Starts at `0`, increments for multi-person reservations

**Data Sources**:
- Reservation response: `listaBiletow` → `ticketsList` (direct mapping)
- Initialization: `0` → `visitorIndex`

**Note**: The field name `wniosekDziecka` in session storage corresponds to `isChildApplication` in our domain types.

---

### 3. `INSTITUTION_CONTEXT_DATA`

**Purpose**: Stores institution (consulate) context information including address, available services, and contact emails.

**Structure**:
```json
{
  "nazwaPlacowki": "Podgorica",
  "nazwaKraju": "CZARNOGÓRA",
  "dostepneUslugi": {
    "wizaKrajowa": true,
    "wizaKrajowa_WYPELNIJ": false,
    "wizaSchengen": true,
    "wizaSchengen_WYPELNIJ": false,
    "mrgBialorus": false,
    "mrgBialorus_WYPELNIJ": false,
    "mrgUkraina": false,
    "mrgUkraina_WYPELNIJ": false,
    "mrgRosja": false,
    "mrgRosja_WYPELNIJ": false,
    "paszportowe": true,
    "prawne": true,
    "obywatelskie": false,
    "kartaPolaka": false
  },
  "adresPlacowki": {
    "adres11": "Kozaračka 79",
    "adres12": "81 000 Podgorica",
    "adres21": "",
    "adres22": ""
  },
  "emaile": {
    "spotkanieZKonsulem": "",
    "sprawyPaszportowe": "",
    "sprawyPrawne": "",
    "sprawyObywatelskie": "",
    "kartaPolaka": ""
  }
}
```

**Field Mapping**:
- `nazwaPlacowki`: **From consulate data** - Consulate name (e.g., "Podgorica")
- `nazwaKraju`: **From country data** - Country name in Polish uppercase (e.g., "CZARNOGÓRA")
- `dostepneUslugi`: **Needs to be fetched** - Available services at the consulate
  - Service flags: `wizaKrajowa`, `wizaSchengen`, `mrgBialorus`, `mrgUkraina`, `mrgRosja`, `paszportowe`, `prawne`, `obywatelskie`, `kartaPolaka`
  - `_WYPELNIJ` suffix indicates if the form can be filled online
- `adresPlacowki`: **From consulate data** - Same structure as `NV_RESERVATION_DATA_CONTEXT.adres`
  - `adres11`: Street address
  - `adres12`: Postal code and city
  - `adres21`, `adres22`: Additional address lines (often empty)
- `emaile`: **Needs to be fetched** - Email contacts for different services

**Data Sources**:
- Consulate name: From `getCountries()` → `consulates[].name` → `nazwaPlacowki`
- Country name: From `getCountries()` → `countries[].name` (convert to Polish uppercase) → `nazwaKraju`
- Address: **Needs additional API call** to fetch consulate details
- Services: **Needs additional API call** to fetch available services
- Emails: **Needs additional API call** to fetch contact emails

**Note**: This data is not currently available in our existing API methods and would require additional endpoints to be implemented.

---

## URL Structure

The form URL follows this pattern:
```
https://secure.e-konsulat.gov.pl/placowki/{consulateId}/wiza-krajowa/formularz/nowy
```

Where:
- `{consulateId}`: The consulate ID (e.g., `143` for Podgorica)
- Service type: `wiza-krajowa` (national visa) or `wiza-schengen` (Schengen visa)

**Example**: `https://secure.e-konsulat.gov.pl/placowki/143/wiza-krajowa/formularz/nowy`

---

## Data Flow Summary

### Available from Current API Calls

1. **From `checkSlots()` response**:
   - `idPlacowki` (consulate ID) → Used in URL
   - `idLokalizacji` (location ID) → Used in reservation request
   - `rodzajUslugi` (service type) → Used to determine service type in URL

2. **From `createReservation()` request**:
   - `date` → `NV_RESERVATION_DATA_CONTEXT.dzienWizyty`
   - `onlyChildren` → `NV_RESERVATION_DATA_CONTEXT.tylko_dzieci`

3. **From `createReservation()` response**:
   - `listaBiletow` → `NV_TICKETS.ticketsList`
   - Each ticket's `bilet`, `data`, `godzina`, `wniosekDziecka` fields

4. **From `getCountries()`**:
   - Consulate name → `INSTITUTION_CONTEXT_DATA.nazwaPlacowki`
   - Country name → `INSTITUTION_CONTEXT_DATA.nazwaKraju` (needs Polish conversion)

### Missing Data (Requires Additional API Calls)

1. **Consulate address** (`adres11`, `adres12`):
   - Not available in current `getCountries()` response
   - Likely available via consulate details endpoint

2. **Available services** (`dostepneUslugi`):
   - Not available in current API responses
   - Would need a consulate services/details endpoint

3. **Contact emails** (`emaile`):
   - Not available in current API responses
   - Would need a consulate details endpoint

---

## Implementation Recommendations

### Immediate Implementation (Using Available Data)

1. **`NV_RESERVATION_DATA_CONTEXT`**:
   - ✅ `dzienWizyty`: From reservation request `date`
   - ✅ `czas`: Generate with `new Date().toISOString()`
   - ⚠️ `adres`: **Partial** - Can use placeholder or fetch separately
   - ✅ `tylko_dzieci`: From reservation request `onlyChildren`

2. **`NV_TICKETS`**:
   - ✅ `ticketsList`: Direct mapping from `listaBiletow`
   - ✅ `visitorIndex`: Initialize to `0`

3. **`INSTITUTION_CONTEXT_DATA`**:
   - ✅ `nazwaPlacowki`: From `getCountries()` consulate name
   - ⚠️ `nazwaKraju`: From `getCountries()` country name (needs Polish conversion)
   - ⚠️ `adresPlacowki`: **Missing** - Needs additional API call
   - ⚠️ `dostepneUslugi`: **Missing** - Needs additional API call
   - ⚠️ `emaile`: **Missing** - Needs additional API call

### Future Enhancements

1. **Add API method to fetch consulate details**:
   - Endpoint: Likely `/api/konfiguracja/placowki/{consulateId}` or similar
   - Returns: Address, available services, contact emails

2. **Add country name translation**:
   - Map English country names to Polish uppercase
   - Or fetch from API with language parameter

3. **Store session data**:
   - Implement browser sessionStorage API wrapper
   - Store all three keys after successful reservation

---

## Cross-Reference Table

| Session Storage Key | Field | Source | Status |
|---------------------|-------|--------|--------|
| `NV_RESERVATION_DATA_CONTEXT` | `dzienWizyty` | `createReservation` request `date` | ✅ Available |
| `NV_RESERVATION_DATA_CONTEXT` | `czas` | Generated timestamp | ✅ Available |
| `NV_RESERVATION_DATA_CONTEXT` | `adres.adres11` | Consulate address | ⚠️ Missing |
| `NV_RESERVATION_DATA_CONTEXT` | `adres.adres12` | Consulate address | ⚠️ Missing |
| `NV_RESERVATION_DATA_CONTEXT` | `tylko_dzieci` | `createReservation` request `onlyChildren` | ✅ Available |
| `NV_TICKETS` | `ticketsList` | `createReservation` response `listaBiletow` | ✅ Available |
| `NV_TICKETS` | `visitorIndex` | Initialize to `0` | ✅ Available |
| `INSTITUTION_CONTEXT_DATA` | `nazwaPlacowki` | `getCountries()` consulate name | ✅ Available |
| `INSTITUTION_CONTEXT_DATA` | `nazwaKraju` | `getCountries()` country name | ⚠️ Needs conversion |
| `INSTITUTION_CONTEXT_DATA` | `adresPlacowki` | Consulate address | ⚠️ Missing |
| `INSTITUTION_CONTEXT_DATA` | `dostepneUslugi` | Consulate services | ⚠️ Missing |
| `INSTITUTION_CONTEXT_DATA` | `emaile` | Consulate contacts | ⚠️ Missing |

---

## Notes

1. **Service Type Mapping**:
   - `rodzajUslugi: 1` = National visa (`wiza-krajowa`)
   - `rodzajUslugi: 2` = Schengen visa (`wiza-schengen`)
   - Used in URL path: `/placowki/{id}/wiza-krajowa/...` or `/placowki/{id}/wiza-schengen/...`

2. **Multi-person Reservations**:
   - `visitorIndex` starts at `0` and increments for each person
   - Each person uses a different ticket from `ticketsList`

3. **Session Persistence**:
   - These values must be stored in browser `sessionStorage` (not `localStorage`)
   - Session storage persists only for the browser tab session
   - Required for the form page to recognize an existing reservation

4. **Form URL**:
   - Format: `https://secure.e-konsulat.gov.pl/placowki/{consulateId}/wiza-krajowa/formularz/nowy`
   - The form page reads from session storage to restore reservation context

