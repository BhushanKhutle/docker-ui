"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: 'Username and password required' });
            return;
        }
        const result = await pool_1.default.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = (0, auth_1.generateToken)({ id: user.id, username: user.username, role: user.role });
        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const result = await pool_1.default.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    }
    catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/register', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Admin only' });
            return;
        }
        const { username, email, password, role } = req.body;
        const hash = await bcryptjs_1.default.hash(password, 10);
        const result = await pool_1.default.query('INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role', [username, email, hash, role || 'readonly']);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'Username or email already exists' });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map