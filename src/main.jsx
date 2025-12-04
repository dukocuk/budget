import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { initLocalDB } from './lib/pglite';
// import './index.css'
import App from './App.jsx';

// Initialize PGlite database before rendering app
initLocalDB()
  .then(() => {
    console.log('✅ Database ready, rendering app...');

    // Validate Google OAuth configuration
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!clientId || !apiKey) {
      console.error('❌ Missing Google OAuth configuration!');
      console.error(
        'VITE_GOOGLE_CLIENT_ID:',
        clientId ? '✅ Set' : '❌ Missing'
      );
      console.error('VITE_GOOGLE_API_KEY:', apiKey ? '✅ Set' : '❌ Missing');

      createRoot(document.getElementById('root')).render(
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>⚠️ Configuration Error</h2>
          <p>Google OAuth credentials missing. Check .env file.</p>
          <pre
            style={{
              textAlign: 'left',
              background: '#f5f5f5',
              padding: '10px',
            }}
          >
            VITE_GOOGLE_CLIENT_ID={clientId ? '✅ Set' : '❌ Missing'}
            {'\n'}
            VITE_GOOGLE_API_KEY={apiKey ? '✅ Set' : '❌ Missing'}
          </pre>
        </div>
      );
      return;
    }

    createRoot(document.getElementById('root')).render(
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    );
  })
  .catch(error => {
    console.error('❌ Failed to initialize database:', error);
    // Still render app, but show error state
    createRoot(document.getElementById('root')).render(
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Database Initialization Error</h2>
        <p>Could not initialize local database: {error.message}</p>
        <p>Please refresh the page to try again.</p>
      </div>
    );
  });
