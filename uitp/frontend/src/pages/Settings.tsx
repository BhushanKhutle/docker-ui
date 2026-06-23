import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Divider, Chip, Alert,
} from '@mui/material';
import { Add, Settings as SettingsIcon } from '@mui/icons-material';
import { authApi } from '../api/index';
import { User, UserRole } from '../types/index';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'default'> = {
  admin: 'error', operator: 'warning', readonly: 'default',
};

const ROLE_DESC: Record<UserRole, string> = {
  admin: 'Full access — manage clusters, nodes, users, and initiate transfers',
  operator: 'Can register nodes, sync images, and initiate transfers — no user management',
  readonly: 'View-only access — cannot make any changes',
};

export default function Settings() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'readonly' as UserRole });
  const [saving, setSaving] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Settings</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          System configuration and user management
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
        {/* Current User */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
              Current User
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: 2,
                background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 700, color: '#060B18',
              }}>
                {currentUser?.username[0].toUpperCase()}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{currentUser?.username}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{currentUser?.email}</Typography>
              </Box>
              <Chip label={currentUser?.role} color={ROLE_COLORS[currentUser?.role || 'readonly']} variant="outlined" sx={{ ml: 'auto' }} />
            </Box>
            {currentUser?.role && (
              <Alert severity="info" sx={{ mt: 2, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', color: '#94A3B8', '& .MuiAlert-icon': { color: '#00D4FF' } }}>
                {ROLE_DESC[currentUser.role]}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* RBAC */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
              Role Permissions
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell align="center">Admin</TableCell>
                  <TableCell align="center">Operator</TableCell>
                  <TableCell align="center">Read-only</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['View clusters, nodes, images', true, true, true],
                  ['Sync node images', true, true, false],
                  ['Register clusters & nodes', true, true, false],
                  ['Initiate image transfers', true, true, false],
                  ['Delete clusters & nodes', true, false, false],
                  ['Manage users', true, false, false],
                ].map(([label, admin, operator, readonly]) => (
                  <TableRow key={label as string}>
                    <TableCell sx={{ fontSize: '0.83rem' }}>{label}</TableCell>
                    {[admin, operator, readonly].map((v, i) => (
                      <TableCell key={i} align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: v ? '#10B981' : 'rgba(148,163,184,0.2)' }} />
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Management (admin only) */}
        {isAdmin && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                  User Management
                </Typography>
                <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                  Add User
                </Button>
              </Box>
              <Alert severity="info" sx={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)', color: '#94A3B8', '& .MuiAlert-icon': { color: '#00D4FF' }, mb: 2 }}>
                Use the API or CLI to manage existing users. Create new users here.
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
              System Information
            </Typography>
            {[
              ['Application', 'Universal Image Transfer Portal (UITP)'],
              ['Version', '1.0.0'],
              ['Backend API', '/api'],
              ['WebSocket', '/ws'],
              ['Database', 'PostgreSQL'],
              ['Supported Engines', 'Docker, Containerd (CRI-O planned)'],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.8rem', fontFamily: '"JetBrains Mono", monospace' }}>{value}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Username" value={form.username} fullWidth size="small" onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <TextField label="Email" value={form.email} fullWidth size="small" type="email" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <TextField label="Password" value={form.password} fullWidth size="small" type="password" onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <TextField select label="Role" value={form.role} fullWidth size="small" onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="operator">Operator</MenuItem>
              <MenuItem value="readonly">Read-only</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !form.username || !form.password} onClick={async () => {
            setSaving(true);
            try {
              await authApi.register(form);
              toast.success('User created');
              setDialogOpen(false);
              setForm({ username: '', email: '', password: '', role: 'readonly' });
            } catch (err: any) {
              toast.error(err.response?.data?.error || 'Failed');
            } finally {
              setSaving(false);
            }
          }}>
            {saving ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
