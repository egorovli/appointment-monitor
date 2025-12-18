# Feasibility Analysis: Automated Reservation + Browser Session Hijacking

## Overview

This document analyzes the feasibility of:
1. Making automated reservations via CLI (fetch API)
2. Receiving all necessary data
3. Injecting session storage data into a browser
4. Opening the browser (Puppeteer) with injected values on `/formularz/nowy` page to hijack/continue the session

---

## 1. Making Automated Reservation via CLI ✅ **FEASIBLE**

### Current Status
- ✅ **Fully implemented** - We have `createReservation()` method in `client.ts`
- ✅ Uses standard `fetch()` API (works in Node.js/Bun)
- ✅ Handles CAPTCHA solving automatically
- ✅ Returns complete reservation data including tickets

### Implementation
```typescript
const result = await client.createReservation({
  date: "2026-01-15",
  locationId: "438",
  token: checkSlotsToken,
  amount: 1
})
// Returns: { ticket, tickets[], verifiedIdentity, isChildApplication }
```

### Conclusion
**✅ YES** - Fully feasible. Already working.

---

## 2. Receiving All Necessary Data ⚠️ **PARTIALLY FEASIBLE**

### Available Data ✅

From `createReservation()` response:
- ✅ `ticket` (main ticket string)
- ✅ `tickets[]` array with:
  - `ticket` (bilet)
  - `date` (data)
  - `time` (godzina)
  - `isChildApplication` (wniosekDziecka)
  - `verifiedIdentity` (zweryfikowanaTozsamosc)

From `checkSlots()` response:
- ✅ `consulateId` (idPlacowki) - for URL construction
- ✅ `locationId` (idLokalizacji)
- ✅ `serviceType` (rodzajUslugi) - determines URL path

From `getCountries()`:
- ✅ Consulate name (`nazwaPlacowki`)
- ✅ Country name (needs Polish conversion)

### Missing Data ⚠️

**Critical Missing Data:**

1. **Consulate Address** (`adres11`, `adres12`)
   - Required for: `NV_RESERVATION_DATA_CONTEXT.adres` and `INSTITUTION_CONTEXT_DATA.adresPlacowki`
   - Impact: **HIGH** - Form may fail validation or display errors
   - Solution: Need to find/fetch consulate details endpoint

2. **Available Services** (`dostepneUslugi`)
   - Required for: `INSTITUTION_CONTEXT_DATA.dostepneUslugi`
   - Impact: **MEDIUM** - May cause form initialization issues
   - Solution: Need consulate details endpoint

3. **Contact Emails** (`emaile`)
   - Required for: `INSTITUTION_CONTEXT_DATA.emaile`
   - Impact: **LOW** - Likely not critical for form functionality
   - Solution: Can use empty object `{}` or fetch from endpoint

4. **Country Name in Polish** (`nazwaKraju`)
   - Required for: `INSTITUTION_CONTEXT_DATA.nazwaKraju`
   - Impact: **LOW** - Display only
   - Solution: Create mapping table or fetch with language parameter

### Workarounds

**Option A: Minimal Required Data**
- Use placeholder/empty values for missing fields
- Test if form accepts incomplete `INSTITUTION_CONTEXT_DATA`
- Risk: Form may reject or show errors

**Option B: Fetch Missing Data**
- Discover consulate details API endpoint
- Make additional API calls before reservation
- More robust but requires endpoint discovery

**Option C: Extract from Browser**
- Use Puppeteer to navigate to consulate page first
- Extract address/services from page HTML/API calls
- More complex but guarantees correct data

### Conclusion
**⚠️ PARTIALLY FEASIBLE** - Core reservation data is available, but some session storage fields require additional data that may need workarounds or additional API calls.

---

## 3. Injecting Session Storage into Browser ✅ **FEASIBLE**

### Puppeteer Capabilities

Puppeteer supports injecting session storage before page load:

```typescript
const browser = await puppeteer.launch()
const page = await browser.newPage()

// Method 1: Set before navigation (recommended)
await page.goto('about:blank')
await page.evaluateOnNewDocument((sessionData) => {
  // Set sessionStorage before page scripts run
  sessionStorage.setItem('NV_RESERVATION_DATA_CONTEXT', JSON.stringify(sessionData.nvReservation))
  sessionStorage.setItem('NV_TICKETS', JSON.stringify(sessionData.nvTickets))
  sessionStorage.setItem('INSTITUTION_CONTEXT_DATA', JSON.stringify(sessionData.institution))
}, {
  nvReservation: { /* ... */ },
  nvTickets: { /* ... */ },
  institution: { /* ... */ }
})

// Then navigate to form page
await page.goto('https://secure.e-konsulat.gov.pl/placowki/143/wiza-krajowa/formularz/nowy')
```

**Alternative Method:**
```typescript
// Method 2: Set after navigation but before page initialization
await page.goto('https://secure.e-konsulat.gov.pl/placowki/143/wiza-krajowa/formularz/nowy', {
  waitUntil: 'domcontentloaded'
})

await page.evaluate((sessionData) => {
  sessionStorage.setItem('NV_RESERVATION_DATA_CONTEXT', JSON.stringify(sessionData.nvReservation))
  sessionStorage.setItem('NV_TICKETS', JSON.stringify(sessionData.nvTickets))
  sessionStorage.setItem('INSTITUTION_CONTEXT_DATA', JSON.stringify(sessionData.institution))
}, sessionData)

// Reload to trigger form initialization
await page.reload()
```

### Timing Considerations

**Critical**: Session storage must be set **before** the Angular/React app initializes and reads from `sessionStorage`. The frontend likely checks session storage on component initialization.

**Best Practice**: Use `evaluateOnNewDocument()` which runs before any page scripts execute.

### Conclusion
**✅ YES** - Fully feasible with Puppeteer. Multiple methods available, timing is critical but manageable.

---

## 4. Opening Browser with Injected Values ✅ **FEASIBLE**

### Implementation Approach

```typescript
import puppeteer from 'puppeteer'

async function openReservationForm(reservationData: {
  consulateId: string
  serviceType: number
  reservationResult: CreateReservationResult
  checkSlotsResult: CheckSlotsResult
  consulateName: string
  countryName: string
}) {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1280, height: 720 }
  })

  const page = await browser.newPage()

  // Construct session storage data
  const sessionData = {
    NV_RESERVATION_DATA_CONTEXT: {
      dzienWizyty: reservationData.reservationResult.tickets[0].date,
      czas: new Date().toISOString(),
      adres: {
        adres11: "PLACEHOLDER", // Need to fetch
        adres12: "PLACEHOLDER"  // Need to fetch
      },
      tylko_dzieci: reservationData.reservationResult.isChildApplication
    },
    NV_TICKETS: {
      ticketsList: reservationData.reservationResult.tickets.map(t => ({
        bilet: t.ticket,
        data: t.date,
        godzina: t.time || "",
        wniosekDziecka: t.isChildApplication
      })),
      visitorIndex: 0
    },
    INSTITUTION_CONTEXT_DATA: {
      nazwaPlacowki: reservationData.consulateName,
      nazwaKraju: reservationData.countryName.toUpperCase(), // Polish conversion needed
      adresPlacowki: {
        adres11: "PLACEHOLDER",
        adres12: "PLACEHOLDER",
        adres21: "",
        adres22: ""
      },
      dostepneUslugi: {
        // Need to fetch or use defaults
        wizaKrajowa: true,
        wizaKrajowa_WYPELNIJ: false,
        // ... other services
      },
      emaile: {
        spotkanieZKonsulem: "",
        sprawyPaszportowe: "",
        sprawyPrawne: "",
        sprawyObywatelskie: "",
        kartaPolaka: ""
      }
    }
  }

  // Inject session storage before page loads
  await page.evaluateOnNewDocument((data) => {
    Object.keys(data).forEach(key => {
      sessionStorage.setItem(key, JSON.stringify(data[key]))
    })
  }, sessionData)

  // Determine service path
  const servicePath = reservationData.serviceType === 1 
    ? 'wiza-krajowa' 
    : 'wiza-schengen'

  // Navigate to form
  const formUrl = `https://secure.e-konsulat.gov.pl/placowki/${reservationData.consulateId}/${servicePath}/formularz/nowy`
  
  await page.goto(formUrl, {
    waitUntil: 'networkidle2'
  })

  return { browser, page }
}
```

### Potential Issues & Solutions

**Issue 1: Session Storage Timing**
- **Problem**: Frontend reads session storage before injection completes
- **Solution**: Use `evaluateOnNewDocument()` which runs before any scripts

**Issue 2: Missing Address Data**
- **Problem**: Form may validate address fields
- **Solution**: 
  - Option A: Fetch consulate details first
  - Option B: Test with placeholders, see if form accepts them
  - Option C: Extract from page before setting session storage

**Issue 3: Cookie/Session Validation**
- **Problem**: Server may validate cookies/session tokens
- **Solution**: 
  - May need to maintain cookies from reservation API calls
  - Use `page.setCookie()` to inject cookies if needed
  - Test if form works without server-side session validation

**Issue 4: CORS/Origin Validation**
- **Problem**: Browser may block or server may reject
- **Solution**: 
  - Puppeteer runs in same-origin context
  - Should not be an issue for session storage injection

### Testing Strategy

1. **Minimal Test**: Inject only `NV_TICKETS` (most critical)
2. **Progressive Enhancement**: Add other keys one by one
3. **Full Test**: Inject all three keys with complete data
4. **Error Handling**: Monitor console for frontend errors

### Conclusion
**✅ YES** - Fully feasible. Puppeteer provides the necessary APIs. Main challenge is ensuring complete data, not the injection mechanism itself.

---

## Overall Feasibility Assessment

### Summary Table

| Step | Feasibility | Status | Notes |
|------|------------|--------|-------|
| 1. Make reservation via CLI | ✅ **FEASIBLE** | ✅ Implemented | Fully working |
| 2. Receive necessary data | ⚠️ **PARTIALLY** | ⚠️ Needs work | Core data available, some fields missing |
| 3. Inject session storage | ✅ **FEASIBLE** | ✅ Ready | Puppeteer supports this |
| 4. Open browser with values | ✅ **FEASIBLE** | ✅ Ready | Standard Puppeteer usage |

### Critical Path Items

1. **✅ Reservation Creation**: Working
2. **⚠️ Address Data**: Need to discover/fetch consulate address
3. **⚠️ Services Data**: May need to fetch or use defaults
4. **✅ Session Storage Injection**: Ready to implement
5. **✅ Browser Automation**: Ready to implement

### Recommended Implementation Order

1. **Phase 1: Basic Injection** (Low Risk)
   - Inject `NV_TICKETS` only
   - Test if form recognizes reservation
   - Validate ticket is accepted

2. **Phase 2: Add Reservation Context** (Medium Risk)
   - Add `NV_RESERVATION_DATA_CONTEXT` with available data
   - Use placeholder for address
   - Test form initialization

3. **Phase 3: Add Institution Data** (Medium Risk)
   - Add `INSTITUTION_CONTEXT_DATA` with available data
   - Use placeholders/defaults for missing fields
   - Test complete form flow

4. **Phase 4: Fetch Missing Data** (Lower Risk)
   - Discover consulate details endpoint
   - Fetch address, services, emails
   - Replace placeholders with real data

### Risk Assessment

**Low Risk:**
- Session storage injection mechanism
- Browser automation setup
- Basic ticket validation

**Medium Risk:**
- Missing address data causing form validation errors
- Timing issues with session storage injection
- Frontend expecting specific data format

**High Risk:**
- Server-side session validation (if exists)
- Form requiring complete `INSTITUTION_CONTEXT_DATA`
- CORS/security restrictions

### Final Verdict

**✅ OVERALL FEASIBLE** with the following caveats:

1. **Core functionality is feasible** - Reservation creation and session injection work
2. **Data completeness may require workarounds** - Some fields need additional API calls or placeholders
3. **Testing required** - Need to validate form accepts injected data
4. **Progressive implementation recommended** - Start minimal, add complexity incrementally

### Next Steps

1. Implement basic Puppeteer integration
2. Test with minimal session storage data (`NV_TICKETS` only)
3. Discover consulate details API endpoint (if exists)
4. Implement full session storage injection
5. Test complete flow end-to-end

---

## Technical Implementation Notes

### Puppeteer Session Storage Injection Pattern

```typescript
// Recommended pattern for reliable injection
await page.evaluateOnNewDocument((data) => {
  // This runs before ANY page scripts
  if (typeof Storage !== 'undefined') {
    Object.entries(data).forEach(([key, value]) => {
      sessionStorage.setItem(key, JSON.stringify(value))
    })
  }
}, sessionData)
```

### Data Transformation Helper

```typescript
function buildSessionStorageData(
  reservationResult: CreateReservationResult,
  checkSlotsResult: CheckSlotsResult,
  consulateName: string,
  countryName: string,
  address?: { adres11: string; adres12: string }
) {
  return {
    NV_RESERVATION_DATA_CONTEXT: {
      dzienWizyty: reservationResult.tickets[0].date,
      czas: new Date().toISOString(),
      adres: address || { adres11: "", adres12: "" },
      tylko_dzieci: reservationResult.isChildApplication
    },
    NV_TICKETS: {
      ticketsList: reservationResult.tickets.map(t => ({
        bilet: t.ticket,
        data: t.date,
        godzina: t.time || "",
        wniosekDziecka: t.isChildApplication
      })),
      visitorIndex: 0
    },
    INSTITUTION_CONTEXT_DATA: {
      nazwaPlacowki: consulateName,
      nazwaKraju: countryName.toUpperCase(),
      adresPlacowki: {
        adres11: address?.adres11 || "",
        adres12: address?.adres12 || "",
        adres21: "",
        adres22: ""
      },
      dostepneUslugi: {
        // Defaults - should be fetched
        wizaKrajowa: true,
        wizaKrajowa_WYPELNIJ: false,
        wizaSchengen: false,
        wizaSchengen_WYPELNIJ: false,
        // ... other defaults
      },
      emaile: {
        spotkanieZKonsulem: "",
        sprawyPaszportowe: "",
        sprawyPrawne: "",
        sprawyObywatelskie: "",
        kartaPolaka: ""
      }
    }
  }
}
```

