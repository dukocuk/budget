import { useAuth } from '../hooks/useAuth';
import './Auth.css';

export default function Auth() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-loading">
          <div className="spinner"></div>
          <p>Indlæser...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-user-info">
        <div className="user-profile">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.full_name || user.email}
              className="user-avatar"
              crossOrigin="anonymous"
            />
          )}
          <div className="user-details">
            <span className="user-name">
              {user.user_metadata?.full_name || user.email}
            </span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <button onClick={signOut} className="btn btn-secondary btn-sm">
          Log ud
        </button>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>💰 Budget Tracker</h1>
          <p>Log ind for at synkronisere dine udgifter på tværs af enheder</p>
        </div>

        {error && (
          <div className="auth-error">
            <p>❌ {error}</p>
          </div>
        )}

        <button onClick={signInWithGoogle} className="btn btn-google">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
            />
            <path
              fill="#34A853"
              d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
            />
            <path
              fill="#FBBC05"
              d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
            />
            <path
              fill="#EA4335"
              d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
            />
          </svg>
          Log ind med Google
        </button>

        <div className="auth-info">
          <h3>Funktioner:</h3>
          <ul>
            <li>✅ Automatisk synkronisering på tværs af enheder</li>
            <li>✅ Virker offline</li>
            <li>✅ Dine data er kun synlige for dig</li>
            <li>✅ Gratis for altid</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
