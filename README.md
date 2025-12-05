# 💰 Budget Tracker

Modern budget tracking application for managing fixed expenses in DKK (Danish Kroner). Features offline-first architecture, cloud synchronization, and multi-year budget management.

## ✨ Features

- 🔐 **Google Authentication** - Secure OAuth 2.0 login with your Google account
- ☁️ **Cloud Sync** - Automatic synchronization to Google Drive across all devices
- 📴 **Offline First** - Full functionality without internet using local PostgreSQL database
- 📊 **Interactive Charts** - Visualize spending with pie, bar, and line charts
- 📅 **Multi-Year Budgets** - Manage multiple budget periods with intelligent balance carryover
- 📋 **Budget Templates** - Create and reuse expense templates
- 📈 **Year Comparison** - Compare spending across different budget years
- 🔍 **Search & Filter** - Quickly find expenses by name, frequency, or active month
- 📥📤 **CSV Import/Export** - Import and export budget data with full validation
- ↩️ **Undo/Redo** - Comprehensive history tracking with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- 🧪 **Well Tested** - 595+ passing tests with comprehensive coverage
- 🇩🇰 **Danish Language** - Fully localized user interface

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Cloud account (free tier sufficient)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd budget
npm install
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. **Enable Google Drive API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. **Create OAuth 2.0 Client ID**:
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - Your production URL (if deploying)
   - Copy the **Client ID**
5. **Create API Key**:
   - Click "Create Credentials" → "API Key"
   - Restrict the key to Google Drive API (recommended)
   - Copy the **API Key**

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Google Cloud credentials:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🛠️ Tech Stack

### Frontend
- **React** 19.1.1 (with Hooks)
- **Vite** 7.1.7 (build tool with HMR)
- **Recharts** 3.2.1 (interactive charts)
- **React Modal** 3.16.3 (modal dialogs)

### Authentication & Sync
- **@react-oauth/google** 0.12.1 (Google OAuth integration)
- **gapi-script** 1.2.0 (Google Drive API client)

### Data & Storage
- **PGlite** 0.3.10 (PostgreSQL database in browser)
- **Google Drive** (cloud backup and multi-device sync)
- **uuid** 11.0.5 (offline-first ID generation)

### Testing
- **Vitest** 3.2.4 (test framework)
- **@testing-library/react** 16.3.0 (component testing)
- **happy-dom** 20.0.0 (lightweight DOM implementation)
- **595+ passing tests** across hooks, components, and utilities

### Code Quality
- **ESLint** 9.36.0 (linting)
- **Prettier** 3.6.2 (code formatting)

## 🏗️ Architecture

### Offline-First Design

**Local Storage (PGlite):**
- All data stored locally in PostgreSQL database running in your browser
- Instant read/write performance with zero network latency
- Full functionality without internet connection
- Data persists across browser sessions

**Cloud Synchronization (Google Drive):**
- Single JSON file: `/BudgetTracker/budget-data.json`
- Automatic sync after changes (debounced 1 second)
- Multi-device polling every 30 seconds
- Conflict resolution: last-write-wins strategy
- User data isolation: each user's data in their own Google Drive

### Data Flow

```
Your Browser  ↔  Google Drive  ↔  Other Devices
     ↓               ↓                 ↓
  PGlite          JSON File         PGlite
  (local)         (cloud)           (local)
```

**How it works:**
1. All operations execute instantly on local PGlite database
2. Changes automatically sync to Google Drive within 1 second
3. Other devices poll for updates every 30 seconds
4. Offline changes sync automatically when back online

## 📁 Project Structure

See [CLAUDE.md](./CLAUDE.md) for comprehensive developer documentation including:
- Detailed component architecture
- State management patterns
- Business logic calculations
- Database schema
- Multi-year budget period system
- Testing strategy

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Visual test UI
npm run test:ui
```

**Test Coverage:**
- 595+ passing tests
- Comprehensive coverage of hooks, components, and utilities
- Integration tests for authentication and sync
- CSV import/export validation
- Multi-year budget period management

## 📦 Build & Deploy

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Deploy

Deploy the `dist/` directory to any static hosting service:
- **Netlify**: Drag & drop `dist/` folder
- **Vercel**: Connect GitHub repo or use CLI
- **GitHub Pages**: Push `dist/` to `gh-pages` branch
- **Cloudflare Pages**: Connect repository

**⚠️ Important:** After deploying, update the **OAuth redirect URIs** in Google Cloud Console to include your production URL.

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive developer guide with architecture details
- **[OAUTH_DEBUG.md](./OAUTH_DEBUG.md)** - OAuth authentication troubleshooting

## 🔧 Available Commands

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run test:ui        # Open test UI
```

## 🌟 Key Features Explained

### Multi-Year Budget Periods
- Create separate budgets for different calendar years
- Automatic balance carryover between years
- Archive old years (read-only mode)
- Compare spending across years

### Budget Templates
- Save common expense patterns as reusable templates
- Quick setup for new budget years
- Category-based organization

### Search & Filtering
- Real-time text search across expense names
- Filter by frequency (monthly, quarterly, yearly)
- Filter by active month
- Combine multiple filters

### Undo/Redo
- Full history tracking for all expense operations
- Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Shift+Z` (redo)
- Works across add, edit, delete, and bulk operations

## 🤝 Contributing

This is a personal project, but suggestions and bug reports are welcome! Please open an issue if you encounter any problems.

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for managing Danish budgets**
