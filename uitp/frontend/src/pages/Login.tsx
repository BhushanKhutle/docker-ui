import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert } from '@mui/material';
import { authApi } from '../api/index';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await authApi.login(username, password);
      setAuth(r.data.user, r.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #060B18 0%, #0A0E1A 100%)',
    }}>
      {/* Background glow */}
      <Box sx={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      <Box sx={{ width: '100%', maxWidth: 400, p: 2, position: 'relative' }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 3, mx: 'auto', mb: 2,
            background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 800, color: '#060B18',
            fontFamily: '"JetBrains Mono", monospace',
            boxShadow: '0 0 32px rgba(0,212,255,0.25)',
          }}>
            UI
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            Universal Image Transfer Portal
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Sign in to manage container image transfers
          </Typography>
        </Box>

        <Card component="form" onSubmit={handleLogin}>
          <CardContent sx={{ p: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Username" value={username} fullWidth autoFocus
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
              <TextField
                label="Password" value={password} fullWidth type="password"
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button
                type="submit" variant="contained" fullWidth size="large"
                disabled={loading || !username || !password}
                sx={{ mt: 1, py: 1.5 }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 2, p: 2, background: 'rgba(148,163,184,0.04)', borderRadius: 2, border: '1px solid rgba(148,163,184,0.08)' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Default credentials
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: '#94A3B8', fontSize: '0.75rem' }}>
            Username: <span style={{ color: '#00D4FF' }}>admin</span><br />
            Password: <span style={{ color: '#00D4FF' }}>admin123</span>
          </Typography>
          <Typography variant="caption" sx={{ color: '#F59E0B', display: 'block', mt: 1, fontSize: '0.68rem' }}>
            ⚠ Change the default password in production
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
