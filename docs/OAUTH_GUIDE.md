# Google OAuth Setup and Troubleshooting Guide

**Last Updated**: 2025-01-30
**OAuth Flow**: Authorization Code Flow with Refresh Tokens
**Required APIs**: Google Drive API, Google+ API (for user info)

---

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Environment Configuration](#environment-configuration)
3. [Common Issues](#common-issues)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Note your project ID for reference

### 2. Enable Required APIs

1. Go to [API Library](https://console.cloud.google.com/apis/library)
2. Search for and enable:
   - **Google Drive API** - Required for backup/sync
   - **Google+ API** - Required for user profile information

### 3. Configure OAuth Consent Screen

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Choose **External** user type (unless you have Google Workspace)
3. Fill in required information:
   - **App name**: Budget Tracker (or your app name)
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (required for testing before verification):
   - Add your Google account email
   - Add any other accounts you want to test with

### 4. Create OAuth 2.0 Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Budget Tracker Web Client (or your preferred name)
   - **Authorized JavaScript origins**:
     - Development: `http://localhost:5173`
     - Production: `https://yourdomain.github.io` (if using GitHub Pages)
   - **Authorized redirect URIs**:
     - Development: `http://localhost:5173`
     - Production: `https://yourdomain.github.io/budget` (adjust for your deployment)
5. Click **Create**
6. **Copy** Client ID and Client Secret (you'll need these next)

---

## Environment Configuration

### 1. Create `.env` File

Create `.env` file in project root:

```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
VITE_GOOGLE_API_KEY=YOUR_API_KEY
```

### 2. Get Your Credentials

**Client ID**:
- From credentials page in Google Cloud Console
- Format: `12345-abc123.apps.googleusercontent.com`

**Client Secret**:
- Click on your OAuth 2.0 Client ID in credentials list
- View client secret (starts with `GOCSPX-`)
- **IMPORTANT**: Never commit this to version control

**API Key** (Optional):
- Create from Credentials → Create Credentials → API Key
- Used for additional Google API calls

### 3. Security Best Practices

**Add `.env` to `.gitignore`**:
```gitignore
# Environment variables
.env
.env.local
.env.production
```

**Never commit credentials**:
- ✅ Use environment variables
- ✅ Document required variables in README
- ❌ Never hardcode credentials in code
- ❌ Never commit `.env` file

### 4. Restart Development Server

After creating/updating `.env`:
```bash
# Stop current dev server (Ctrl+C)
# Start fresh
npm run dev
```

---

## Common Issues

### Issue 1: "redirect_uri_mismatch"

**Symptom**: Error message about redirect URI not matching

**Cause**: The redirect URI in your Google Cloud Console doesn't exactly match your app's URL

**Fix**:
1. Check current redirect URI in browser console (logged on auth attempt)
2. Go to Google Cloud Console → Credentials → Your OAuth Client
3. Ensure **Authorized redirect URIs** includes EXACT match:
   - Development: `http://localhost:5173` (no trailing slash)
   - If using different port: `http://localhost:XXXX` (replace XXXX)
4. Save changes and wait 5 minutes for propagation

**Common Mistakes**:
- ❌ `http://localhost:5173/` (trailing slash)
- ❌ `https://localhost:5173` (https instead of http)
- ❌ Wrong port number
- ✅ `http://localhost:5173` (correct)

### Issue 2: "invalid_client"

**Symptom**: OAuth fails with "invalid_client" error

**Cause**: Client ID or Client Secret is incorrect

**Fix**:
1. Verify `.env` file has correct credentials
2. Check for extra spaces or newlines in `.env` values
3. Ensure credentials copied from correct OAuth client in Console
4. Restart dev server after updating `.env`

**Verification**:
```javascript
// In browser console, check loaded values:
console.log(import.meta.env.VITE_GOOGLE_CLIENT_ID)
// Should show your client ID, not undefined
```

### Issue 3: "access_denied"

**Symptom**: User is redirected back but sees "access_denied" error

**Cause**: User declined permission or account not added as test user

**Fix**:
1. Ensure user account is added to test users in OAuth consent screen
2. Try signing in again and grant all requested permissions
3. If in production, publish app for verification or add users to test user list

### Issue 4: "unauthorized_client"

**Symptom**: Error says client is not authorized for this grant type

**Cause**: OAuth client not configured for authorization code flow

**Fix**:
1. Verify OAuth client is type **Web application** (not Desktop or Mobile)
2. Ensure redirect URIs are configured (required for code flow)
3. Check that Drive API is enabled for project

### Issue 5: Silent Auth Failure

**Symptom**: OAuth popup/redirect completes but nothing happens

**Cause**: Usually redirect URI mismatch or missing scope approval

**Fix**:
1. Open browser DevTools (F12) → Console tab
2. Look for logged errors during auth flow
3. Check Network tab for failed requests to `accounts.google.com`
4. Verify all required scopes are approved in consent screen

---

## Testing

### 1. Development Testing

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:5173
# Click "Log ind med Google" button
# Complete OAuth flow in popup/redirect
```

**Expected Flow**:
1. Click login button
2. Redirect to Google OAuth consent screen
3. Grant permissions
4. Redirect back to app
5. App exchanges code for tokens
6. User logged in, dashboard visible

### 2. Console Logging

The app logs OAuth flow steps to browser console:

```
🔗 Redirecting to: https://accounts.google.com/o/oauth2/v2/auth?...
🔑 Exchange authorization code for token
✅ Token exchange successful
👤 User authenticated: {sub: '...', email: '...'}
```

**Debugging**: Watch console for these logs to identify where flow fails

### 3. Manual Token Exchange Test

If auth fails, test token exchange manually:

```javascript
// In browser console after redirect with code
const code = new URLSearchParams(window.location.search).get('code');
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const redirectUri = window.location.origin + '/';

fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })
}).then(r => r.json()).then(console.log);
```

### 4. Test User Management

**Add Test Users** (during development):
1. Go to OAuth consent screen → Test users
2. Click **Add Users**
3. Enter Google account emails
4. Save

**Remove Test Users** (after publishing):
- Once app is verified, test user restrictions are removed
- All Google users can authenticate

---

## Troubleshooting

### Debug Checklist

When OAuth isn't working, check these in order:

- [ ] `.env` file exists in project root
- [ ] `.env` has all three required variables
- [ ] Client ID format looks correct (`*.apps.googleusercontent.com`)
- [ ] Client Secret starts with `GOCSPX-`
- [ ] Dev server was restarted after editing `.env`
- [ ] Google Cloud Console has correct redirect URI
- [ ] Drive API and Google+ API are enabled
- [ ] User account is in test users list (if not published)
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows no 400/401 errors

### Enable Debug Logging

For detailed OAuth debugging, add to `src/utils/logger.js`:

```javascript
export const logger = {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => console.debug('[DEBUG]', ...args), // Add this
  // ...
};
```

Then in auth code, add debug logs:
```javascript
logger.debug('OAuth redirect URI:', redirectUri);
logger.debug('OAuth scopes:', scope);
logger.debug('Token response:', tokenResponse);
```

### Browser Storage Issues

If auth works but doesn't persist:

```javascript
// In browser console, check sessionStorage
console.log('Auth state:', sessionStorage.getItem('auth_state'));

// Clear all storage
sessionStorage.clear();
localStorage.clear();

// Try auth again
```

### Network Inspection

**Check token exchange request**:
1. Open DevTools → Network tab
2. Filter for `oauth2.googleapis.com`
3. Attempt login
4. Inspect request to `/token` endpoint
5. Check request payload and response

**Common request issues**:
- Missing or incorrect `client_secret`
- Wrong `redirect_uri`
- Expired or invalid `code`
- Missing required parameters

### Production Deployment Issues

**GitHub Pages / Static Hosting**:

Update `.env.production`:
```env
VITE_GOOGLE_CLIENT_ID=same_as_development
VITE_GOOGLE_CLIENT_SECRET=same_as_development
VITE_GOOGLE_API_KEY=same_as_development
```

Update Google Console redirect URIs:
```
https://yourusername.github.io/budget
https://yourdomain.com
```

**Build and test**:
```bash
npm run build
npm run preview  # Test production build locally
```

### Still Having Issues?

**Gather diagnostic information**:

1. **Environment check**:
   ```javascript
   console.log({
     hasClientId: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
     hasClientSecret: !!import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
     redirectUri: window.location.origin + '/',
   });
   ```

2. **Google Console config**:
   - Screenshot of authorized redirect URIs
   - List of enabled APIs
   - OAuth consent screen status

3. **Browser console errors**:
   - Any red errors during auth flow
   - Network tab failures
   - Console logs from auth attempt

4. **Create GitHub issue** with above info for help

---

## OAuth Flow Reference

### Authorization Code Flow (Current Implementation)

**Step 1: Redirect to Google**
```
User clicks login
→ App builds OAuth URL
→ App redirects to accounts.google.com
```

**Step 2: User Grants Permission**
```
User sees consent screen
→ User approves scopes
→ Google redirects back with authorization code
```

**Step 3: Exchange Code for Tokens**
```
App receives code in URL query
→ App makes POST to oauth2.googleapis.com/token
→ Google returns access_token + refresh_token
```

**Step 4: Store Tokens**
```
App stores tokens in sessionStorage
→ App fetches user profile
→ User is authenticated
```

**Step 5: Use Tokens**
```
App includes access_token in API requests
→ If token expires, use refresh_token to get new access_token
→ Seamless reauthentication without user interaction
```

### Why Authorization Code Flow?

**Benefits**:
- ✅ Refresh tokens for long-term access
- ✅ More secure than implicit flow
- ✅ Tokens not exposed in URL
- ✅ Better for SPAs with backend proxy

**Scopes Used**:
- `drive.file` - Access to app-created Drive files only
- `userinfo.profile` - User name and profile picture
- `userinfo.email` - User email address

---

## Security Considerations

### Client Secret Exposure

**Risk**: Client secret in frontend code is visible to users

**Mitigation**:
- Use authorization code flow (not implicit)
- Restrict OAuth client to specific redirect URIs
- Monitor OAuth usage in Google Cloud Console
- Rotate client secret if compromised

**Future Enhancement**:
- Move token exchange to backend proxy
- Store client secret server-side only
- Use PKCE for additional security

### Token Storage

**Current**: Tokens stored in `sessionStorage`
- ✅ Cleared when browser closes
- ✅ Not accessible to other domains
- ❌ Vulnerable to XSS attacks

**Best Practices**:
- Never log tokens to console in production
- Clear tokens on logout
- Implement token expiration checks
- Use secure HttpOnly cookies if backend available

### Scope Restrictions

**Principle of Least Privilege**:
- Only request scopes you need
- Current scopes are minimal for app functionality
- Users can see exactly what permissions they're granting

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Reference](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) - Test API calls
- [Google Cloud Console](https://console.cloud.google.com/) - Manage credentials

---

## Migration Notes

**From Old OAuth Setup**:
- Old files: `OAUTH_SETUP.md`, `OAUTH_DEBUG.md` (archived)
- Old flow: Had debugging issues and hardcoded credentials
- New flow: Authorization code flow with refresh tokens
- New structure: Centralized in `useAuth` hook and `Auth` component
