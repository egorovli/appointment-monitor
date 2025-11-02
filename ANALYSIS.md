# API Parameter Analysis: rejestracjapoznan.poznan.uw.gov.pl

## Overview
Analysis of how the reservation system sets parameters for API requests to `/api/Slot/GetAvailableDaysForOperation`.

## API Endpoint
```
GET https://rejestracjapoznan.poznan.uw.gov.pl/api/Slot/GetAvailableDaysForOperation
```

### Parameters
- `companyName` (query parameter)
- `lastStepId` (query parameter)
- `recaptchaToken` (query parameter)
- `Authorization` header (Bearer token)

## Parameter Sources

### 1. `companyName` Parameter

**Source**: `config.js` file
**Location**: `https://rejestracjapoznan.poznan.uw.gov.pl/config.js`

```javascript
document.appSettings = {
    "COMPANY_NAME": "uwpoznan",
    // ... other config
}
```

**How it's used**:
- The `COMPANY_NAME` is read from `document.appSettings.COMPANY_NAME`
- It's stored in Vuex store (`$store.state.companyName`)
- Also available as a computed property in Vue components (`this.companyName`)
- Used directly in API URLs: `/api/.../{companyName}`

**Value**: `"uwpoznan"` (hardcoded in config.js)

### 2. `lastStepId` Parameter

**Source**: Vue Reservation Component (computed property)
**Component**: `reservation` component

**How it's determined**:
- `lastStepId` is a **computed property** in the Vue reservation component
- It represents the **last completed step** in the reservation flow
- The reservation flow has 4 steps:
  1. Operation selection (step 1)
  2. Date and time selection (step 2)
  3. Personal data (step 3)
  4. Terms and confirmation (step 4)

**Logic**:
- When user is on step 2, `lastStepId = 1` (completed step 1)
- When user is on step 3, `lastStepId = 2` (completed step 2)
- The API call is made when transitioning to step 2, so `lastStepId` is set to the previous step ID

**Example**: If user just selected an operation and clicked "Next" to go to step 2, `lastStepId = 1`

### 3. `recaptchaToken` Parameter

**Source**: Google reCAPTCHA API
**Library**: Google reCAPTCHA v2 (invisible)

**How it's generated**:
1. The page loads Google reCAPTCHA with site key from `config.js`:
   ```javascript
   CAPTCHA_V2_KEY: "6LfJTj4aAAAAAHNjOCN_7TIB-Fpy50Ir6D92TcY2"
   ```

2. Before making the API call, the component calls:
   ```javascript
   grecaptcha.execute(captchaV2SiteKey, {action: '...'})
   ```
   or similar reCAPTCHA execution method

3. The token is stored in the component's `captchaV2Token` data property
4. The token is included in the API request query parameters

**Token characteristics**:
- Generated dynamically for each API request
- Valid for a short period (typically a few minutes)
- Must be verified by the server

### 4. `Authorization` Header (Bearer Token)

**Source**: JWT token from sessionStorage
**Location**: `sessionStorage.getItem("token")`

**How it's obtained**:
1. On page load, the app calls:
   ```
   GET /api/Authentication/GetEmptyToken/uwpoznan
   ```
2. This returns a JWT token that's stored in `sessionStorage`
3. The token is then used in all API requests via an axios interceptor:

```javascript
r.a.interceptors.request.use((function(t){
    t.headers.common["Authorization"]="Bearer "+sessionStorage.getItem("token")
    return t
}))
```

**Token Structure** (decoded JWT payload):
```json
{
  "companyName": "uwpoznan",
  "companyId": "1",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Guest",
  "nbf": 1762116691,
  "exp": 253402297200,
  "iss": "QMSWebReservation.API",
  "aud": "QMSWebReservation.CLIENT"
}
```

**Token Lifetime**: Very long expiration (exp: 253402297200 = year 9999), but can be refreshed

## Request Flow

1. **Page Load**:
   - Loads `config.js` → sets `companyName = "uwpoznan"`
   - Calls `/api/Authentication/GetEmptyToken/uwpoznan` → stores JWT in sessionStorage
   - Initializes Vue app with company name from config

2. **User Selects Operation**:
   - User clicks on an operation button (e.g., "PASZPORTY - Składanie wniosków o paszport")
   - `selectedOperation` is set in component data

3. **User Clicks "Dalej" (Next)**:
   - Component transitions to step 2
   - `lastStepId` computed property returns `1` (previous step)
   - Component calls `getAvailableDates()` method

4. **Before API Call**:
   - Component executes reCAPTCHA to get token:
     ```javascript
     await grecaptcha.execute(siteKey, {action: '...'})
     ```
   - Token is stored in `captchaV2Token`

5. **API Request**:
   ```javascript
   GET /api/Slot/GetAvailableDaysForOperation?
       companyName=uwpoznan&
       lastStepId=1&
       recaptchaToken=<generated_token>
   ```
   With header:
   ```
   Authorization: Bearer <jwt_token_from_sessionStorage>
   ```

## Key Files

1. **config.js**: Contains `COMPANY_NAME` configuration
2. **app.8dc1d6d0.js**: Main Vue application bundle
3. **chunk-df7ab688.cdcb6fcc.js**: Reservation component bundle
4. **Axios interceptor**: Sets Authorization header automatically

## Implementation Notes

- The application uses **Vue.js 2** with **Vuex** for state management
- **Axios** is used for HTTP requests with interceptors
- **Google reCAPTCHA v2** (invisible) is used for bot protection
- The JWT token is stored in **sessionStorage** (not localStorage)
- All API requests go through `/api` base path
- The `companyName` is embedded in the JWT token payload as well

## Example Implementation

To replicate the API call:

```javascript
// 1. Get token from sessionStorage (or call GetEmptyToken endpoint)
const token = sessionStorage.getItem('token');

// 2. Generate reCAPTCHA token
const recaptchaToken = await grecaptcha.execute('6LfJTj4aAAAAAHNjOCN_7TIB-Fpy50Ir6D92TcY2', {
  action: 'getAvailableDays'
});

// 3. Make API request
const response = await fetch(
  `https://rejestracjapoznan.poznan.uw.gov.pl/api/Slot/GetAvailableDaysForOperation?` +
  `companyName=uwpoznan&` +
  `lastStepId=1&` +
  `recaptchaToken=${recaptchaToken}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```



