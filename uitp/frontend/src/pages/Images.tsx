import React, { useEffect, useState } from 'react';
import {
  Box, Card, Typography, TextField, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, InputAdornment, Drawer, IconButton,
  List, ListItem, ListItemText, Divider, Button, Tooltip,
} from '@mui/material';
import { Search, Close, CompareArrows, PhotoLibrary } from '@mui/icons-material';
import { imagesApi } from '../api/index';
import { Image, ImageLocation } from '../types/index';
import EnvBadge from '../components/layout/EnvBadge';
import { formatBytes } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function Images() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Image | null>(null);
  const [locations, setLocations] = useState<ImageLocation | null>(null);
  const navigate = useNavigate();

  const load = (q?: string) => {
    setLoading(true);
    imagesApi.list(q).then(r => setImages(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    const t = setTimeout(() => load(val), 400);
    return () => clearTimeout(t);
  };

  const handleRowClick = async (img: Image) => {
    setSelected(img);
    const r = await imagesApi.getLocations(img.id);
    setLocations(r.data);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Images</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Global image registry — search and manage container images
          </Typography>
        </Box>
        <TextField
          size="small" placeholder="Search images..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
          }}
        />
      </Box>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Tag</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Clusters</TableCell>
              <TableCell>Nodes</TableCell>
              <TableCell>Digest</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
            ) : images.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <PhotoLibrary sx={{ fontSize: 40, color: 'text.secondary', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">
                    {search ? `No images matching "${search}"` : 'No images discovered yet — sync your nodes'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : images.map(img => (
              <TableRow
                key={img.id} hover
                onClick={() => handleRowClick(img)}
                sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(0,212,255,0.03)' } }}
              >
                <TableCell>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', fontWeight: 500, color: 'text.primary' }}>
                    {img.repository}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={img.tag} size="small" sx={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem',
                    background: 'rgba(0,212,255,0.08)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)',
                  }} />
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', fontFamily: '"JetBrains Mono", monospace' }}>
                  {img.size_bytes ? formatBytes(img.size_bytes) : '—'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {img.environments?.map(e => <EnvBadge key={e} env={e} />)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={img.node_count} size="small" sx={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem',
                    background: 'rgba(16,185,129,0.08)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)',
                  }} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary', fontSize: '0.68rem' }}>
                    {img.digest ? img.digest.slice(0, 20) + '…' : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right" onClick={e => e.stopPropagation()}>
                  <Tooltip title="Transfer this image">
                    <Button
                      size="small" variant="outlined"
                      startIcon={<CompareArrows />}
                      onClick={() => navigate(`/transfer?image_id=${img.id}`)}
                      sx={{ fontSize: '0.7rem', py: 0.3 }}
                    >
                      Transfer
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={!!selected} onClose={() => { setSelected(null); setLocations(null); }}
        PaperProps={{ sx: { width: 400, background: '#0D1425', borderLeft: '1px solid rgba(148,163,184,0.1)', p: 0 } }}
      >
        {selected && (
          <Box>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>Image Details</Typography>
              <IconButton size="small" onClick={() => { setSelected(null); setLocations(null); }}><Close /></IconButton>
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ p: 2, background: 'rgba(0,212,255,0.05)', borderRadius: 2, border: '1px solid rgba(0,212,255,0.15)', mb: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Name</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85rem', color: '#00D4FF', wordBreak: 'break-all' }}>
                  {selected.full_name}
                </Typography>
              </Box>
              {[
                { label: 'Repository', value: selected.repository },
                { label: 'Tag', value: selected.tag },
                { label: 'Size', value: selected.size_bytes ? formatBytes(selected.size_bytes) : '—' },
                { label: 'Digest', value: selected.digest || '—' },
                { label: 'Created', value: selected.created_date || '—' },
                { label: 'Discovered', value: formatDistanceToNow(new Date(selected.created_at), { addSuffix: true }) },
              ].map(item => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{item.label}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.primary', fontSize: '0.75rem', fontFamily: '"JetBrains Mono", monospace', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Divider />
            <Box sx={{ p: 2.5 }}>
              <Typography variant="overline" sx={{ fontSize: '0.65rem', color: 'text.secondary', mb: 1.5, display: 'block' }}>
                Present on ({locations?.present_nodes?.length || 0} nodes)
              </Typography>
              <List dense disablePadding>
                {locations?.present_nodes?.map(n => (
                  <ListItem key={n.node_id} disablePadding sx={{ py: 0.3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.78rem', flex: 1 }}>{n.node_name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>{n.cluster_name}</Typography>
                      <EnvBadge env={n.environment} />
                    </Box>
                  </ListItem>
                ))}
              </List>
              {locations?.present_nodes?.length === 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Not available on any node</Typography>
              )}
            </Box>
            <Divider />
            <Box sx={{ p: 2.5 }}>
              <Typography variant="overline" sx={{ fontSize: '0.65rem', color: 'text.secondary', mb: 1.5, display: 'block' }}>
                Missing on ({locations?.missing_nodes?.length || 0} nodes)
              </Typography>
              <List dense disablePadding>
                {locations?.missing_nodes?.slice(0, 8).map(n => (
                  <ListItem key={n.node_id} disablePadding sx={{ py: 0.3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.78rem', flex: 1 }}>{n.node_name}</Typography>
                      <EnvBadge env={n.environment} />
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box sx={{ p: 2.5, borderTop: '1px solid rgba(148,163,184,0.1)' }}>
              <Button
                fullWidth variant="contained" startIcon={<CompareArrows />}
                onClick={() => navigate(`/transfer?image_id=${selected.id}`)}
              >
                Transfer This Image
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
