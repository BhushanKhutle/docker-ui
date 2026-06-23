import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Storage, DeviceHub, PhotoLibrary, CloudSync,
  CheckCircle, Error, HourglassEmpty, TrendingUp,
} from '@mui/icons-material';
import { dashboardApi } from '../api/index';
import { DashboardStats } from '../types/index';
import EnvBadge from '../components/layout/EnvBadge';
import StatusChip from '../components/layout/StatusChip';
import { formatDistanceToNow } from 'date-fns';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            background: `${color}15`, border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats().then(r => setStats(r.data)).finally(() => setLoading(false));
    const interval = setInterval(() => {
      dashboardApi.getStats().then(r => setStats(r.data));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const s = stats?.transfer_stats_24h;
  const totalTransfers = s ? (Number(s.success) + Number(s.failed) + Number(s.running) + Number(s.pending)) : 0;
  const successRate = totalTransfers > 0 ? Math.round((Number(s?.success || 0) / totalTransfers) * 100) : 0;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          System overview — image inventory and transfer activity
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Clusters', value: stats?.total_clusters ?? '—', icon: <Storage />, color: '#00D4FF', subtitle: 'Active environments' },
          { title: 'Total Nodes', value: stats?.total_nodes ?? '—', icon: <DeviceHub />, color: '#7C3AED', subtitle: 'Connected hosts' },
          { title: 'Image Inventory', value: stats?.total_images ?? '—', icon: <PhotoLibrary />, color: '#10B981', subtitle: 'Node-image entries' },
          { title: 'Unique Images', value: stats?.unique_images ?? '—', icon: <CloudSync />, color: '#F59E0B', subtitle: 'Distinct images tracked' },
        ].map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            {loading ? <Skeleton variant="rounded" height={110} /> : <StatCard {...card} />}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Transfer Stats 24h */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
                Transfers — Last 24 Hours
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Success', value: s?.success ?? 0, color: '#10B981', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
                  { label: 'Failed', value: s?.failed ?? 0, color: '#EF4444', icon: <Error sx={{ fontSize: 16 }} /> },
                  { label: 'Running', value: s?.running ?? 0, color: '#00D4FF', icon: <TrendingUp sx={{ fontSize: 16 }} /> },
                  { label: 'Pending', value: s?.pending ?? 0, color: '#F59E0B', icon: <HourglassEmpty sx={{ fontSize: 16 }} /> },
                ].map(item => (
                  <Grid item xs={6} key={item.label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 1.5, background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
                      <Box sx={{ color: item.color }}>{item.icon}</Box>
                      <Box>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '1.2rem', color: 'text.primary', lineHeight: 1 }}>
                          {loading ? '—' : item.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>{item.label}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {!loading && totalTransfers > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>Success rate</Typography>
                    <Typography variant="caption" sx={{ color: '#10B981', fontSize: '0.7rem', fontFamily: '"JetBrains Mono", monospace' }}>{successRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={successRate} sx={{ height: 4 }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transfers */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 1.5 }}>
                Recent Transfers
              </Typography>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Image</TableCell>
                      <TableCell>Route</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.recent_transfers?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                          No transfers yet
                        </TableCell>
                      </TableRow>
                    )}
                    {stats?.recent_transfers?.map(t => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.image_name}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {t.source_environment && <EnvBadge env={t.source_environment as any} />}
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>→</Typography>
                            {t.destination_environment && <EnvBadge env={t.destination_environment as any} />}
                          </Box>
                        </TableCell>
                        <TableCell><StatusChip status={t.status as any} /></TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                          {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
