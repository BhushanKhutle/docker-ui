import React from 'react';
import { Chip } from '@mui/material';
import { EnvironmentType } from '../../types';
import { ENV_COLORS } from '../../theme';

interface EnvBadgeProps {
  env: EnvironmentType;
  size?: 'small' | 'medium';
}

export default function EnvBadge({ env, size = 'small' }: EnvBadgeProps) {
  const colors = ENV_COLORS[env] || ENV_COLORS.DEV;
  return (
    <Chip
      label={env}
      size={size}
      sx={{
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: size === 'small' ? '0.65rem' : '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        height: size === 'small' ? 20 : 24,
      }}
    />
  );
}
