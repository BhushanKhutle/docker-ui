import React, { useEffect, useState } from 'react';
import {
  Box, Card, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Dialog, DialogTitle, DialogContent,
  TextField, MenuItem, IconButton, Button, Pagination, Paper,
} from '@mui/material';
import { Visibility, History } from '@mui/icons-material';
import { transfersApi } from '../api/index';
import { Transfer, TransferStatus } from '../types/index';
import StatusChip from '../components/layout/StatusChip';
import EnvBadge from '../components/layout/EnvBadge';
import { formatDistanceToNow } from 'date-fns';

const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 20;

export default function TransferHistory() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<Transfer | null>(null);

  const load = () => {
    setLoading(true);
    transfersApi.list({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: statusFilter || undefined,
    }).then(r => {
      setTransfers(r.data.transfers);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const formatDuration = (s?: number) => {
    if (!s) return '—';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Transfer History</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Audit log of all image transfer operations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            select size="small" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            sx={{ width: 160 }}
          >
            {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
          <Button size="small" variant="outlined" onClick={load}>Refresh</Button>
        </Box>
      </Box>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Initiated by</TableCell>
              <TableCell>Time</TableCell>
              <TableCell align="right">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <History sx={{ fontSize: 40, color: 'text.secondary', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">No transfer history yet</Typography>
                </TableCell>
              </TableRow>
            ) : transfers.map(t => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.image_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{t.source_node_name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>{t.source_cluster_name}</Typography>
                      {t.source_environment && <EnvBadge env={t.source_environment} />}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{t.destination_node_name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>{t.destination_cluster_name}</Typography>
                      {t.destination_environment && <EnvBadge env={t.destination_environment} />}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><StatusChip status={t.status as TransferStatus} /></TableCell>
                <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                  {formatDuration(t.duration_seconds)}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  {t.initiated_by_username || '—'}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setDetail(t)}>
                    <Visibility fontSize="small" sx={{ color: 'text.secondary' }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > PAGE_SIZE && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={Math.ceil(total / PAGE_SIZE)}
              page={page}
              onChange={(_, p) => setPage(p)}
              sx={{ '& .MuiPaginationItem-root': { color: 'text.secondary' } }}
            />
          </Box>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Transfer Details
              <StatusChip status={detail.status as TransferStatus} size="medium" />
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ p: 2, background: 'rgba(0,212,255,0.05)', borderRadius: 1.5, border: '1px solid rgba(0,212,255,0.15)' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Image</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', color: '#00D4FF' }}>{detail.image_name}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {[
                    { label: 'Source Node', value: detail.source_node_name },
                    { label: 'Destination Node', value: detail.destination_node_name },
                    { label: 'Source Cluster', value: detail.source_cluster_name },
                    { label: 'Destination Cluster', value: detail.destination_cluster_name },
                    { label: 'Duration', value: detail.duration_seconds ? `${detail.duration_seconds}s` : '—' },
                    { label: 'Initiated by', value: detail.initiated_by_username || '—' },
                  ].map(item => (
                    <Box key={item.label} sx={{ p: 1.5, background: 'rgba(148,163,184,0.04)', borderRadius: 1, border: '1px solid rgba(148,163,184,0.08)' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block' }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', mt: 0.3 }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
                {detail.error_message && (
                  <Box sx={{ p: 1.5, background: 'rgba(239,68,68,0.08)', borderRadius: 1, border: '1px solid rgba(239,68,68,0.2)' }}>
                    <Typography variant="caption" sx={{ color: '#EF4444', display: 'block', mb: 0.5 }}>Error</Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: '#F87171' }}>{detail.error_message}</Typography>
                  </Box>
                )}
                {detail.logs && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Logs</Typography>
                    <Paper sx={{ background: '#060B18', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 1.5, p: 2, maxHeight: 300, overflow: 'auto' }}>
                      {detail.logs.split('\n').map((line, i) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', lineHeight: 1.8, color: '#94A3B8' }}>
                          {line}
                        </Typography>
                      ))}
                    </Paper>
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
