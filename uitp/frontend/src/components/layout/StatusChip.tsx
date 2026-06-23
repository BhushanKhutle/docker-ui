import React from 'react';
import { Chip, Box } from '@mui/material';
import { TransferStatus } from '../../types';
import { STATUS_COLORS } from '../../theme';

interface StatusChipProps {
  status: TransferStatus;
  size?: 'small' | 'medium';
}

const STATUS_LABELS: Record<TransferStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const color = STATUS_COLORS[status] || '#64748B';
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {status === 'running' && (
        <Box sx={{
          width: 6, height: 6, borderRadius: '50%', background: color,
          animation: 'pulse 1.5s infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.5, transform: 'scale(0.8)' },
          },
        }} />
      )}
      <Chip
        label={STATUS_LABELS[status]}
        size={size}
        sx={{
          background: `${color}18`,
          color,
          border: `1px solid ${color}40`,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: size === 'small' ? '0.65rem' : '0.75rem',
          fontWeight: 600,
          height: size === 'small' ? 20 : 24,
        }}
      />
    </Box>
  );
}
