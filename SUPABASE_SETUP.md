# Supabase Setup Guide

Follow these steps to set up your Supabase backend for the Budget Tracker application.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or sign in with your Google account
3. Click "New Project"
4. Fill in:
   - **Name**: budget-tracker-2025
   - **Database Password**: (generate a strong password - save it!)
   - **Region**: Choose closest to you
5. Click "Create new project" (wait ~2 minutes for setup)

## Step 2: Get API Credentials

1. In your project dashboard, go to **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 3: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Paste the following SQL and click "Run":

```sql
-- Create expenses table
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  end_month INTEGER NOT NULL CHECK (end_month BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create settings table
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  monthly_payment INTEGER NOT NULL DEFAULT 0,
  previous_balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses table
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for settings table
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_frequency ON expenses(frequency);
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
```

## Step 4: Enable Google Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Google provider** to ON
4. You'll need to set up Google OAuth:

### Google OAuth Setup:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   (Replace `your-project` with your actual Supabase project URL)
7. Copy **Client ID** and **Client Secret**
8. Paste them into Supabase Google provider settings
9. Click **Save**

## Step 5: Configure Environment Variables

1. In your project root, create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...your-key-here
   ```

3. **Never commit `.env` to Git!** (Already in `.gitignore`)

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser
3. You should see:
   - Login screen with "Sign in with Google" button
   - After login, your email displayed
   - Empty expenses list (no data yet)

## Troubleshooting

### Error: "Invalid API key"
- Double-check your `.env` file has correct values
- Restart dev server after changing `.env`

### Error: "Auth provider not found"
- Make sure Google provider is enabled in Supabase dashboard
- Check Google OAuth credentials are correct

### Error: "row-level security policy"
- Run the SQL script again in Supabase SQL Editor
- Ensure RLS policies were created successfully

### Can't see real-time updates
- Check that Realtime is enabled for tables:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
  ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  ```

## Security Notes

✅ **Row Level Security (RLS)** ensures users can only see their own data
✅ **API keys** are safe to use in frontend (anon key has limited permissions)
✅ **Never share** your service_role key (not needed for this app)
✅ **Google OAuth** handles authentication securely

## Next Steps

Once setup is complete:
1. Sign in with your Google account
2. The app will auto-migrate your localStorage data (if any)
3. Start adding expenses
4. Test cross-device sync by opening app on another device

---

Need help? Check:
- [Supabase Documentation](https://supabase.com/docs)
- [Google OAuth Setup Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
