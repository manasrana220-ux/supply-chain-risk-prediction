import React, { useState } from 'react';
import { Lock, User, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../config';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('analyst');
  const [successMessage, setSuccessMessage] = useState('');

  // Password reset/forgot states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isForgotPassword) {
        // Reset Password API request
        const response = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            username, 
            recovery_phrase: recoveryPhrase, 
            new_password: newPassword 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Password reset failed. Please check your username and phrase.');
        }

        setSuccessMessage('Password reset successfully! Please sign in with your new password.');
        setIsForgotPassword(false);
        setPassword('');
        setNewPassword('');
        setRecoveryPhrase('');
      } else if (isRegistering) {
        // Register API request
        const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password, role, recovery_phrase: recoveryPhrase }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Registration failed. Please try again.');
        }

        setSuccessMessage('Account created successfully! Please sign in.');
        setIsRegistering(false);
        setPassword('');
        setRecoveryPhrase('');
      } else {
        // Login API request
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);

        const response = await fetch(`${API_BASE}/api/v1/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Authentication failed. Please check credentials.');
        }

        const data = await response.json();
        onLoginSuccess(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreFill = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowOverlay} />
      <div className="glass-panel animate-scale-up" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Shield size={36} color="var(--primary)" />
          </div>
          <h1 className="display-font" style={styles.title}>Supply Chain Risk Portal</h1>
          <p style={styles.subtitle}>
            {isForgotPassword
              ? 'Recover your account password using your phrase'
              : isRegistering 
                ? 'Create a new account to access risk model dashboard' 
                : 'Enter credentials to access risk model dashboard'}
          </p>
        </div>

        {error && (
          <div style={styles.errorContainer} className="animate-fade-in">
            <AlertCircle size={18} color="var(--color-high)" />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={styles.successContainer} className="animate-fade-in">
            <CheckCircle2 size={18} color="var(--color-low)" />
            <span style={styles.successText}>{successMessage}</span>
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.icon} />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Recovery Phrase</label>
              <div style={styles.inputWrapper}>
                <Shield size={18} style={styles.icon} />
                <input
                  type="text"
                  placeholder="Enter recovery phrase"
                  value={recoveryPhrase}
                  onChange={(e) => setRecoveryPhrase(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.icon} />
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.icon} />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.icon} />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {!isRegistering && (
              <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                <span 
                  onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }} 
                  style={{ ...styles.toggleLink, fontSize: '0.8rem' }}
                >
                  Forgot Password?
                </span>
              </div>
            )}

            {isRegistering && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Recovery Phrase (for password reset)</label>
                  <div style={styles.inputWrapper}>
                    <Shield size={18} style={styles.icon} />
                    <input
                      type="text"
                      placeholder="e.g. supply-chain"
                      value={recoveryPhrase}
                      onChange={(e) => setRecoveryPhrase(e.target.value)}
                      required
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Assign Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={styles.select}
                  >
                    <option value="analyst">Analyst (Read & Predict)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading 
                ? (isRegistering ? 'Registering...' : 'Authenticating...') 
                : (isRegistering ? 'Create New Account' : 'Sign In to Dashboard')}
            </button>
          </form>
        )}

        <div style={styles.toggleText}>
          {isForgotPassword ? (
            <>
              Remember your password?{' '}
              <span 
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMessage(''); }} 
                style={styles.toggleLink}
              >
                Sign In
              </span>
            </>
          ) : isRegistering ? (
            <>
              Already have an account?{' '}
              <span 
                onClick={() => { setIsRegistering(false); setError(''); setSuccessMessage(''); }} 
                style={styles.toggleLink}
              >
                Sign In
              </span>
            </>
          ) : (
            <>
              New to the portal?{' '}
              <span 
                onClick={() => { setIsRegistering(true); setError(''); setSuccessMessage(''); }} 
                style={styles.toggleLink}
              >
                Create Account
              </span>
            </>
          )}
        </div>

        {!isRegistering && !isForgotPassword && (
          <>
            <div style={styles.divider}>
              <span style={styles.dividerText}>Demo Credentials</span>
            </div>

            <div style={styles.demoButtons}>
              <button
                type="button"
                onClick={() => handlePreFill('admin', 'admin123')}
                style={styles.demoBtn}
              >
                <strong>Administrator</strong>
                <span style={styles.demoSub}>Full access (admin)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePreFill('analyst', 'analyst123')}
                style={styles.demoBtn}
              >
                <strong>Analyst</strong>
                <span style={styles.demoSub}>Read & Predict</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1.5rem',
    position: 'relative',
    overflow: 'hidden',
  },
  glowOverlay: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: -1,
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoContainer: {
    display: 'inline-flex',
    padding: '1rem',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(99, 102, 241, 0.08)',
    marginBottom: '1rem',
    border: '1px solid rgba(99, 102, 241, 0.15)',
  },
  title: {
    fontSize: '1.75rem',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-high)',
    border: '1px solid var(--border-high)',
    marginBottom: '1.5rem',
  },
  errorText: {
    color: 'var(--color-high)',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  button: {
    width: '100%',
    padding: '0.85rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--primary)',
    border: 'none',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: '600',
    marginTop: '0.5rem',
    transition: 'background-color var(--transition-fast), transform 0.1s ease',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '2rem 0 1.5rem 0',
  },
  dividerText: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0 0.75rem',
    backgroundColor: 'transparent',
    whiteSpace: 'nowrap',
    width: '100%',
    textAlign: 'center',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
  },
  demoButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  demoBtn: {
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.15rem',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
  },
  demoSub: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    cursor: 'pointer',
    backgroundImage: 'none',
  },
  successContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-low)',
    border: '1px solid var(--border-low)',
    marginBottom: '1.5rem',
  },
  successText: {
    color: 'var(--color-low)',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  toggleText: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '1.5rem',
  },
  toggleLink: {
    color: 'var(--primary)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
// Add active focus states dynamically or override in style sheet
