import React, { useState } from 'react';

interface ForgotPasswordProps {
  onPasswordReset: (email: string) => void;
  onVerificationEmailSent: (email: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onPasswordReset, onVerificationEmailSent }) => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handlePasswordReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        throw new Error('Failed to reset password');
      }
      onPasswordReset(email);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/send-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        throw new Error('Failed to send verification email');
      }
      onVerificationEmailSent(email);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Forgot Password</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePasswordReset();
        }}
      >
        <label htmlFor="email" aria-label="Email">
          Email:
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-required="true"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Reset Password'}
        </button>
      </form>
      <button onClick={sendVerificationEmail} disabled={loading}>
        {loading ? 'Sending...' : 'Send Verification Email'}
      </button>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default ForgotPassword;