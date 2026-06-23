import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00D4FF',
      light: '#33DDFF',
      dark: '#0095B3',
      contrastText: '#0A0E1A',
    },
    secondary: {
      main: '#7C3AED',
      light: '#9D67F5',
      dark: '#5B21B6',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
    },
    background: {
      default: '#060B18',
      paper: '#0D1425',
    },
    text: {
      primary: '#E2E8F0',
      secondary: '#94A3B8',
    },
    divider: 'rgba(148,163,184,0.12)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5, color: '#94A3B8' },
    caption: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' },
    overline: { letterSpacing: '0.1em', fontWeight: 600, fontSize: '0.7rem' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #060B18 0%, #0A0E1A 100%)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#1E293B #060B18',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#060B18' },
          '&::-webkit-scrollbar-thumb': { background: '#1E293B', borderRadius: 3 },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(13,20,37,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#0A0E1A',
          borderRight: '1px solid rgba(148,163,184,0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(13,20,37,0.8)',
          border: '1px solid rgba(148,163,184,0.1)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(0,212,255,0.2)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 6,
          letterSpacing: '0.01em',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00D4FF 0%, #0095B3 100%)',
          color: '#060B18',
          '&:hover': {
            background: 'linear-gradient(135deg, #33DDFF 0%, #00B3D4 100%)',
            boxShadow: '0 0 20px rgba(0,212,255,0.3)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.7rem',
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: 'rgba(148,163,184,0.08)',
        },
        head: {
          background: 'rgba(6,11,24,0.5)',
          color: '#64748B',
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(148,163,184,0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(0,212,255,0.4)' },
            '&.Mui-focused fieldset': { borderColor: '#00D4FF' },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          background: 'rgba(148,163,184,0.1)',
        },
        bar: {
          background: 'linear-gradient(90deg, #00D4FF 0%, #7C3AED 100%)',
          borderRadius: 4,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#0D1425',
          border: '1px solid rgba(148,163,184,0.15)',
          borderRadius: 12,
        },
      },
    },
  },
});

export const ENV_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  DEV:  { bg: 'rgba(100,116,139,0.15)',  color: '#94A3B8', border: 'rgba(100,116,139,0.4)' },
  UAT:  { bg: 'rgba(245,158,11,0.1)',   color: '#F59E0B', border: 'rgba(245,158,11,0.4)' },
  PP:   { bg: 'rgba(124,58,237,0.1)',   color: '#A78BFA', border: 'rgba(124,58,237,0.4)' },
  PROD: { bg: 'rgba(239,68,68,0.1)',    color: '#F87171', border: 'rgba(239,68,68,0.4)' },
  DR:   { bg: 'rgba(16,185,129,0.1)',   color: '#34D399', border: 'rgba(16,185,129,0.4)' },
};

export const STATUS_COLORS: Record<string, string> = {
  success: '#10B981',
  failed: '#EF4444',
  running: '#00D4FF',
  pending: '#F59E0B',
  cancelled: '#64748B',
};
