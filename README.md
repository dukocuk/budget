# =� Budget Tracker

Modern budget tracking application with cross-device sync, offline support, and real-time updates.

## ( Features

- = **Google Authentication** - Secure login with your Google account
- < **Cross-Device Sync** - Real-time synchronization across all your devices
- =� **Offline Mode** - Works without internet, syncs when back online
- =� **Interactive Charts** - Visualize your spending with Pie, Bar, and Line charts
- =� **Local PostgreSQL** - Fast local database (PGlite) in your browser
-  **Cloud Backup** - Automatic backup to Supabase
- <� **Modern UI** - Clean, responsive design with tab navigation
- <�<� **Danish Language** - Fully localized for Danish users

## =� Quick Start

### 1. Setup Supabase (15 min)
Follow [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)

### 2. Configure Environment (2 min)
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Replace App.jsx (1 min)
```bash
# Windows
copy src\App.new.jsx src\App.jsx

# Mac/Linux
cp src/App.new.jsx src/App.jsx
```

### 4. Start App (1 min)
```bash
npm run dev
```

## =� Documentation

- **[NEXT_STEPS.md](./NEXT_STEPS.md)** � **START HERE** for complete setup guide
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Database configuration
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Technical details

## <� Tech Stack

- React 19 + Vite
- PGlite (Local PostgreSQL)
- Supabase (Cloud + Realtime)
- Recharts (Charts)

## =� How It Works

```
Your Browser �� Supabase Cloud �� Other Devices
     �               �               �
  PGlite         PostgreSQL       PGlite
  (local)         (cloud)         (local)
```

##  What's Built (95% Complete)

All components ready! Just need to:
1. Setup Supabase
2. Create `.env` file
3. Replace `App.jsx`

See [`NEXT_STEPS.md`](./NEXT_STEPS.md) for details.

---

**Need help?** Check the documentation files!
