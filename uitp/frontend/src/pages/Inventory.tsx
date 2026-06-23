import React, { useEffect, useState } from 'react';
import {
  Box, Card, Typography, TextField, InputAdornment,
  Tooltip, Chip, CircularProgress,
} from '@mui/material';
import { Search, CheckCircle, Cancel } from '@mui/icons-material';
import { imagesApi } from '../api/index';
import { Inventory, InventoryRow } from '../types/index';
import EnvBadge from '../components/layout/EnvBadge';
import { formatBytes } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function InventoryPage() {
  const [data, setData] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    imagesApi.getInventory().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = data?.inventory.filter(img =>
    !search || img.full_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
      <CircularProgress sx={{ color: '#00D4FF' }} />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Image Inventory</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Cross-cluster presence matrix — see where each image lives
          </Typography>
        </Box>
        <TextField
          size="small" placeholder="Search images..."
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
        />
      </Box>

      <Card sx={{ overflow: 'auto' }}>
        <Box sx={{ minWidth: 600 }}>
          {/* Header row */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: `minmax(280px,1fr) 100px ${data?.clusters.map(() => '110px').join(' ')}`,
            borderBottom: '1px solid rgba(148,163,184,0.1)',
            background: 'rgba(6,11,24,0.5)',
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            <Box sx={{ p: 1.5, pl: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontWeight: 600 }}>
                Image
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontWeight: 600 }}>
                Size
              </Typography>
            </Box>
            {data?.clusters.map(c => (
              <Box key={c.id} sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>
                  {c.name}
                </Typography>
                <EnvBadge env={c.environment} />
              </Box>
            ))}
          </Box>

          {/* Data rows */}
          {filtered.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {search ? `No images matching "${search}"` : 'No image data — sync your nodes first'}
              </Typography>
            </Box>
          ) : filtered.map((img, idx) => {
            const presentCount = data?.clusters.filter(c => img.presence[c.id]).length || 0;
            const totalClusters = data?.clusters.length || 0;
            return (
              <Box
                key={img.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `minmax(280px,1fr) 100px ${data?.clusters.map(() => '110px').join(' ')}`,
                  borderBottom: '1px solid rgba(148,163,184,0.05)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.02)',
                  '&:hover': { background: 'rgba(0,212,255,0.03)', cursor: 'pointer' },
                  transition: 'background 0.15s',
                }}
                onClick={() => navigate(`/transfer?image_id=${img.id}`)}
              >
                <Box sx={{ p: 1.5, pl: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', fontWeight: 500, color: 'text.primary' }}>
                      {img.repository}
                    </Typography>
                    <Chip label={img.tag} size="small" sx={{
                      mt: 0.3, height: 16, fontSize: '0.6rem', fontFamily: '"JetBrains Mono", monospace',
                      background: 'rgba(0,212,255,0.08)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.15)',
                    }} />
                  </Box>
                  <Box sx={{ ml: 'auto', mr: 1 }}>
                    <Chip
                      label={`${presentCount}/${totalClusters}`}
                      size="small"
                      sx={{
                        height: 18, fontSize: '0.62rem', fontFamily: '"JetBrains Mono", monospace',
                        background: presentCount === totalClusters ? 'rgba(16,185,129,0.1)' : presentCount === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: presentCount === totalClusters ? '#34D399' : presentCount === 0 ? '#F87171' : '#FCD34D',
                        border: `1px solid ${presentCount === totalClusters ? 'rgba(16,185,129,0.3)' : presentCount === 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary', fontSize: '0.72rem' }}>
                    {img.size_bytes ? formatBytes(img.size_bytes) : '—'}
                  </Typography>
                </Box>
                {data?.clusters.map(c => (
                  <Box key={c.id} sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {img.presence[c.id] ? (
                      <Tooltip title={`Present in ${c.name}`}>
                        <CheckCircle sx={{ fontSize: 18, color: '#10B981' }} />
                      </Tooltip>
                    ) : (
                      <Tooltip title={`Missing from ${c.name}`}>
                        <Cancel sx={{ fontSize: 18, color: 'rgba(148,163,184,0.2)' }} />
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      </Card>

      <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ fontSize: 14, color: '#10B981' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>Present on cluster</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Cancel sx={{ fontSize: 14, color: 'rgba(148,163,184,0.3)' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>Missing from cluster</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
          Click any row to transfer image
        </Typography>
      </Box>
    </Box>
  );
}
