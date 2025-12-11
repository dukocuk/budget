# Google OAuth Setup Guide

## ❌ Current Error: "Unauthorized"

This means Google rejected the token exchange. Let's fix it step by step.

## 🔍 Step 1: Check Your Client Secret

**IMPORTANT**: The client secret in `.env` must be the real value, not the placeholder!

1. Open `.env` file
2. Check `VITE_GOOGLE_CLIENT_SECRET=`
3. If it still says `your_client_secret_here`, you need to replace it with the real secret

### Getting Your Client Secret:

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID in the list
3. Click the **name** (not the edit icon)
4. You'll see:
   ```
   Client ID: 37062168115-n0lh6l5fufcq4euqhnlpju0tj266tmgm.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxxx  <-- COPY THIS
   ```
5. Copy the **Client Secret** value
6. Paste it in `.env`:
   ```
   VITE_GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-secret-here
   ```
7. **RESTART YOUR DEV SERVER** (`npm run dev`)

## 🔍 Step 2: Check Redirect URI

The redirect URI in your code MUST EXACTLY match what's in Google Cloud Console.

### Current Redirect URI (from your code):
```
http://localhost:5173
```

### Verify in Google Cloud Console:

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, you should see:
   ```
   http://localhost:5173
   ```

   **NOT:**
   - `http://localhost:5173/` (with trailing slash)
   - `http://localhost:5174`
   - `https://localhost:5173`

4. If it's wrong, click **Edit**, fix the URI, and **Save**

## 🔍 Step 3: Verify OAuth Client Type

1. In [Credentials](https://console.cloud.google.com/apis/credentials)
2. Your OAuth client should be type: **Web application**
3. If it says "Desktop app" or "Mobile app", you need to create a new **Web application** client

## 🔍 Step 4: Test Again

1. **Clear your browser storage:**
   - Open DevTools (F12)
   - Go to **Application** tab → **Local Storage** → Clear all

2. **Restart your dev server:**
   ```bash
   npm run dev
   ```

3. **Try logging in again**

4. **Check the console** for the detailed error (I just added better logging)

## 🐛 Debugging Tips

### Check the error details in console:

After you try to log in, look for this in the browser console:
```
❌ Token exchange failed: {
  status: 401,
  error: "...",
  error_description: "...",
  hasClientSecret: true or false  <-- Should be TRUE
  redirectUri: "..."  <-- Should match Google Console
}
```

### Common Issues:

| Error | Cause | Fix |
|-------|-------|-----|
| `hasClientSecret: false` | Client secret not set | Copy real secret from Google Console |
| `redirect_uri_mismatch` | URIs don't match | Update Google Console to match your app |
| `invalid_client` | Wrong client ID/secret | Double-check credentials |
| `unauthorized_client` | Client not configured for code flow | Verify it's a "Web application" type |

## 📋 Checklist

- [ ] Client secret copied from Google Console (starts with `GOCSPX-`)
- [ ] Client secret pasted in `.env` file
- [ ] Dev server restarted after editing `.env`
- [ ] Redirect URI in Google Console: `http://localhost:5173` (no trailing slash)
- [ ] OAuth client type is "Web application"
- [ ] Browser localStorage cleared
- [ ] Tried logging in again

## 🆘 Still Not Working?

Share the error details from the console (the object that starts with `❌ Token exchange failed:`) and I can help debug further!
