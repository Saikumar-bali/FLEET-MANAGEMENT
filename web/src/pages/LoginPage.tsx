import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';

export function LoginPage() {
  const auth = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (auth.accessToken && auth.user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await auth.login(identifier, password);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-panel login-panel-shell">
        <div className="login-aside">
          <div className="login-brand-mark">HF</div>
          <p className="eyebrow login-eyebrow">Fleet Management Platform</p>
          <h1 className="login-title">A calmer admin workspace</h1>
          <p className="login-copy">
            Fresh colors, clearer hierarchy, and responsive layouts across desktop, tablet, and phone.
          </p>
          <div className="login-feature-list">
            <div className="login-feature-item">
              <strong>Unified control</strong>
              <span>Roles, users, vehicles, and assets in one consistent shell.</span>
            </div>
            <div className="login-feature-item">
              <strong>Responsive by default</strong>
              <span>The navigation and content adapt cleanly from wide screens down to mobile widths.</span>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <p className="eyebrow">Secure Sign In</p>
          <h2 className="login-form-title">Welcome back</h2>
          <p className="login-copy">
            Use your username or email and password to enter the workspace.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Username or email</span>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="admin"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>

            {error ? <div className="error-banner">{error}</div> : null}

            <button type="submit" className="primary-button login-submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
