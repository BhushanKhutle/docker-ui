import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import clusterRoutes from './routes/clusters';
import nodeRoutes from './routes/nodes';
import imageRoutes from './routes/images';
import transferRoutes from './routes/transfers';
import dashboardRoutes from './routes/dashboard';
import { initWebSocketServer } from './websocket/wsServer';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Security
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));

// Rate limiting
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later' },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// WebSocket
initWebSocketServer(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 UITP Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready at ws://localhost:${PORT}/ws`);
});

export default app;
