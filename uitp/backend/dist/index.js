"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = __importDefault(require("./routes/auth"));
const clusters_1 = __importDefault(require("./routes/clusters"));
const nodes_1 = __importDefault(require("./routes/nodes"));
const images_1 = __importDefault(require("./routes/images"));
const transfers_1 = __importDefault(require("./routes/transfers"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const wsServer_1 = require("./websocket/wsServer");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Security
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
// Rate limiting
app.use('/api/auth', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts, please try again later' },
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/clusters', clusters_1.default);
app.use('/api/nodes', nodes_1.default);
app.use('/api/images', images_1.default);
app.use('/api/transfers', transfers_1.default);
app.use('/api/dashboard', dashboard_1.default);
// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
// WebSocket
(0, wsServer_1.initWebSocketServer)(server);
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 UITP Backend running on port ${PORT}`);
    console.log(`📡 WebSocket server ready at ws://localhost:${PORT}/ws`);
});
exports.default = app;
//# sourceMappingURL=index.js.map