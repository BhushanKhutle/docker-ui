import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Tooltip, Chip,
} from '@mui/material';
import {
  Dashboard, Storage, DeviceHub, PhotoLibrary,
  CompareArrows, History, Settings, ExitToApp, CloudSync,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth';

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: <Dashboard /> },
  { path: '/clusters', label: 'Clusters', icon: <Storage /> },
  { path: '/nodes', label: 'Nodes', icon: <DeviceHub /> },
  { path: '/images', label: 'Images', icon: <PhotoLibrary /> },
  { path: '/inventory', label: 'Inventory', icon: <CloudSync /> },
  { path: '/transfer', label: 'Transfer', icon: <CompareArrows /> },
  { path: '/history', label: 'History', icon: <History /> },
  { path: '/settings', label: 'Settings', icon: <Settings /> },
];

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'default'> = {
  admin: 'error',
  operator: 'warning',
  readonly: 'default',
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#060B18', fontFamily: '"JetBrains Mono", monospace',
            flexShrink: 0,
            boxShadow: '0 0 16px rgba(0,212,255,0.3)',
          }}
        >
          UI
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem', lineHeight: 1.2 }}>
            UITP
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            Image Transfer Portal
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Tooltip key={item.path} title="" placement="right">
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={active}
                sx={{
                  borderRadius: 1.5, mb: 0.5, px: 1.5, py: 0.9,
                  '&.Mui-selected': {
                    background: 'rgba(0,212,255,0.1)',
                    borderLeft: '2px solid #00D4FF',
                    '& .MuiListItemIcon-root': { color: '#00D4FF' },
                    '& .MuiListItemText-primary': { color: '#E2E8F0' },
                  },
                  '&:hover': { background: 'rgba(148,163,184,0.06)' },
                  borderLeft: '2px solid transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: active ? '#00D4FF' : '#64748B', '& svg': { fontSize: 18 } }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400, color: active ? 'text.primary' : 'text.secondary' }}
                />
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider />

      {/* User info */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.8rem' }}>
            {user?.username}
          </Typography>
          <Chip
            label={user?.role}
            size="small"
            color={ROLE_COLORS[user?.role || 'readonly']}
            variant="outlined"
            sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
          />
        </Box>
        <ListItemButton
          onClick={logout}
          sx={{ borderRadius: 1.5, px: 1.5, py: 0.75, color: 'text.secondary', '&:hover': { background: 'rgba(239,68,68,0.1)', color: '#EF4444' } }}
        >
          <ListItemIcon sx={{ minWidth: 30, color: 'inherit', '& svg': { fontSize: 16 } }}>
            <ExitToApp />
          </ListItemIcon>
          <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: '0.8rem' }} />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}
