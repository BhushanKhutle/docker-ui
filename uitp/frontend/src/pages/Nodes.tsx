import React, { useEffect, useState } from 'react';
import {
  Box, Card, Typography, Button, Table, TableHead, TableBody,
  TableRow, TableCell, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Tooltip, Chip, CircularProgress,
  Select, FormControl, InputLabel,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, PlayArrow, Sync, CheckCircle, Cancel } from '@mui/icons-material';
import { nodesApi, clustersApi } from '../api/index';
import { Node, Cluster, NodeType, AuthType } from '../types/index';
import EnvBadge from '../components/layout/EnvBadge';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/auth';

const NODE_TYPES: NodeType[] = ['docker', 'kubernetes', 'containerd'];

const emptyForm = {
  cluster_id: '', name: '', ip_address: '', ssh_port: 22,
  username: 'root', auth_type: 'password' as AuthType,
  password: '', ssh_key: '', node_type: 'docker' as NodeType,
};

export default function Nodes() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Node | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [filterCluster, setFilterCluster] = useState('');
  const { user } = useAuthStore();
  const canWrite = user?.role === 'admin' || user?.role === 'operator';

  const load = () => {
    setLoading(true);
    Promise.all([
      nodesApi.list(filterCluster || undefined),
      clustersApi.list(),
    ]).then(([n, c]) => {
      setNodes(n.data);
      setClusters(c.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterCluster]);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const r = await nodesApi.testConnection(id);
      if (r.data.success) toast.success('Connection successful!');
      else toast.error('Connection failed');
    } catch {
      toast.error('Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (id: string, name: string) => {
    setSyncingId(id);
    try {
      const r = await nodesApi.sync(id);
      toast.success(`${name}: synced ${r.data.count} images`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        await nodesApi.update(editItem.id, form);
        toast.success('Node updated');
      } else {
        await nodesApi.create(form);
        toast.success('Node created');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Nodes</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Manage worker nodes and Docker hosts across all clusters
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontSize: '0.8rem' }}>Filter by cluster</InputLabel>
            <Select
              value={filterCluster} label="Filter by cluster"
              onChange={e => setFilterCluster(e.target.value)}
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value="">All clusters</MenuItem>
              {clusters.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={load}>Refresh</Button>
          {canWrite && (
            <Button variant="contained" size="small" startIcon={<Add />}
              onClick={() => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); }}
            >Add Node</Button>
          )}
        </Box>
      </Box>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Node</TableCell>
              <TableCell>Cluster</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Connection</TableCell>
              <TableCell>Images</TableCell>
              <TableCell>Last Sync</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
            ) : nodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No nodes found</Typography>
                </TableCell>
              </TableRow>
            ) : nodes.map(n => (
              <TableRow key={n.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace' }}>
                    {n.ip_address}:{n.ssh_port}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.8rem' }}>{n.cluster_name}</Typography>
                    <EnvBadge env={n.environment} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={n.node_type} size="small" sx={{
                    background: 'rgba(124,58,237,0.1)', color: '#A78BFA',
                    border: '1px solid rgba(124,58,237,0.2)',
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem',
                  }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${n.username}@${n.ip_address}`}
                    size="small"
                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', background: 'rgba(148,163,184,0.05)' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={n.image_count || 0} size="small" sx={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem',
                    background: 'rgba(16,185,129,0.1)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)',
                  }} />
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  {n.last_sync_at ? formatDistanceToNow(new Date(n.last_sync_at), { addSuffix: true }) : 'Never'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Test connection">
                    <span>
                      <IconButton size="small" onClick={() => handleTest(n.id)} disabled={testingId === n.id}>
                        {testingId === n.id ? <CircularProgress size={14} /> : <PlayArrow fontSize="small" sx={{ color: '#10B981' }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  {canWrite && (
                    <Tooltip title="Sync images">
                      <span>
                        <IconButton size="small" onClick={() => handleSync(n.id, n.name)} disabled={syncingId === n.id}>
                          {syncingId === n.id ? <CircularProgress size={14} /> : <Sync fontSize="small" sx={{ color: '#00D4FF' }} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {canWrite && (
                    <>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditItem(n); setForm({ ...emptyForm, cluster_id: n.cluster_id, name: n.name, ip_address: n.ip_address, ssh_port: n.ssh_port, username: n.username, auth_type: n.auth_type, node_type: n.node_type }); setDialogOpen(true); }}>
                          <Edit fontSize="small" sx={{ color: 'text.secondary' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={async () => { if (confirm(`Delete node "${n.name}"?`)) { await nodesApi.delete(n.id); load(); } }}>
                          <Delete fontSize="small" sx={{ color: '#EF4444' }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? 'Edit Node' : 'Add Node'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField select label="Cluster" value={form.cluster_id} fullWidth size="small"
              onChange={e => setForm(f => ({ ...f, cluster_id: e.target.value }))}>
              {clusters.map(c => <MenuItem key={c.id} value={c.id}>{c.name} ({c.environment})</MenuItem>)}
            </TextField>
            <TextField label="Node Name" value={form.name} fullWidth size="small"
              placeholder="e.g. pp-worker1"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="IP Address" value={form.ip_address} fullWidth size="small"
                placeholder="192.168.1.10"
                onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} />
              <TextField label="SSH Port" value={form.ssh_port} size="small" sx={{ width: 120 }}
                type="number"
                onChange={e => setForm(f => ({ ...f, ssh_port: parseInt(e.target.value) || 22 }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Username" value={form.username} fullWidth size="small"
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              <TextField select label="Auth Type" value={form.auth_type} fullWidth size="small"
                onChange={e => setForm(f => ({ ...f, auth_type: e.target.value as AuthType }))}>
                <MenuItem value="password">Password</MenuItem>
                <MenuItem value="ssh_key">SSH Key</MenuItem>
              </TextField>
            </Box>
            {form.auth_type === 'password' ? (
              <TextField label="Password" value={form.password} fullWidth size="small" type="password"
                placeholder={editItem ? 'Leave blank to keep current' : 'Enter password'}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            ) : (
              <TextField label="SSH Private Key" value={form.ssh_key} fullWidth size="small" multiline rows={4}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                onChange={e => setForm(f => ({ ...f, ssh_key: e.target.value }))} />
            )}
            <TextField select label="Node Type" value={form.node_type} fullWidth size="small"
              onChange={e => setForm(f => ({ ...f, node_type: e.target.value as NodeType }))}>
              {NODE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name || !form.cluster_id || !form.ip_address}>
            {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Node'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
