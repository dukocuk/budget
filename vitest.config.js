import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        'src/main.jsx',
        'src/lib/supabase.js',
        'src/lib/pglite.js',
        'src/hooks/useSyncContext.js',
        'src/hooks/useAuth.js',
        'src/hooks/useSettings.js',
        'src/hooks/useExpenses.js',
        'src/components/Auth.jsx',
        'src/components/Header.jsx',
        'src/components/*Chart*.jsx',
        'src/components/Dashboard.jsx',
        'src/components/ExpenseManager.jsx'
      ]
    }
  }
})
