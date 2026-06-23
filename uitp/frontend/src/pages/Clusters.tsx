import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Table, TableHead,
  TableBody, TableRow, TableCell, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Tooltip, Chip,
} from '@mui/material';
import { Add, Edit, Delete, Storage, Refresh } from '@mui/icons-material';
import { clustersApi } from '../api/index';
import { Cluster, EnvironmentType } from '../types/index';
import EnvBadge from '../components/layout/EnvBadge';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/auth';

const ENVS: EnvironmentType[] = ['DEV', 'UAT', 'PP', 'PROD', 'DR'];

const emptyForm = { name: '', environment: 'DEV' as EnvironmentType, description: '' };

export default function Clusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cluster | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  const canWrite = user?.role === 'admin' || user?.role === 'operator';

  const load = () => {
    setLoading(true);
    clustersApi.list().then(r => setClusters(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Cluster) => {
    setEditItem(c);
    setForm({ name: c.name, environment: c.environment, description: c.description || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.environment) return;
    setSaving(true);
    try {
      if (editItem) {
        await clustersApi.update(editItem.id, form);
        toast.success('Cluster updated');
      } else {
        await clustersApi.create(form);
        toast.success('Cluster created');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Cluster) => {
    if (!confirm(`Delete cluster "${c.name}"?`)) return;
    try {
      await clustersApi.delete(c.id);
      toast.success('Cluster deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Clusters</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Manage registered Kubernetes and Docker environments
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={load}>Refresh</Button>
          {canWrite && <Button variant="contained" size="small" startIcon={<Add />} onClick={openCreate}>Add Cluster</Button>}
        </Box>
      </Box>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Nodes</TableCell>
              <TableCell>Images</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              {canWrite && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
            ) : clusters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Storage sx={{ fontSize: 40, color: 'text.secondary', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">No clusters registered yet</Typography>
                  {canWrite && <Button sx={{ mt: 1 }} startIcon={<Add />} onClick={openCreate}>Add your first cluster</Button>}
                </TableCell>
              </TableRow>
            ) : clusters.map(c => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell><EnvBadge env={c.environment} /></TableCell>
                <TableCell>
                  <Chip label={c.node_count || 0} size="small" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }} />
                </TableCell>
                <TableCell>
                  <Chip label={c.image_count || 0} size="small" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }} />
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{c.description || '—'}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </TableCell>
                {canWrite && (
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: 'text.secondary' }}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(c)} sx={{ color: '#EF4444' }}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? 'Edit Cluster' : 'Add Cluster'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Cluster Name" value={form.name} fullWidth size="small"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. PP Cluster, PROD Cluster"
            />
            <TextField
              select label="Environment" value={form.environment} fullWidth size="small"
              onChange={e => setForm(f => ({ ...f, environment: e.target.value as EnvironmentType }))}
            >
              {ENVS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </TextField>
            <TextField
              label="Description" value={form.description} fullWidth size="small" multiline rows={2}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name}>
            {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Create Cluster'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
