"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /clusters
router.get('/', async (_req, res) => {
    try {
        const result = await pool_1.default.query(`
      SELECT c.*,
        COUNT(DISTINCT n.id) FILTER (WHERE n.is_active = true) as node_count,
        COUNT(DISTINCT ni.image_id) as image_count
      FROM clusters c
      LEFT JOIN nodes n ON n.cluster_id = c.id
      LEFT JOIN node_images ni ON ni.node_id = n.id
      GROUP BY c.id
      ORDER BY c.environment, c.name
    `);
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: `Failed to fetch clusters: ${err.message}` });
    }
});
// GET /clusters/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query(`SELECT c.*, COUNT(DISTINCT n.id) FILTER (WHERE n.is_active=true) as node_count
       FROM clusters c
       LEFT JOIN nodes n ON n.cluster_id = c.id
       WHERE c.id = $1 GROUP BY c.id`, [req.params.id]);
        if (!result.rows[0]) {
            res.status(404).json({ error: 'Cluster not found' });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: `Failed to fetch cluster: ${err.message}` });
    }
});
// POST /clusters
router.post('/', (0, auth_1.requireRole)('admin', 'operator'), async (req, res) => {
    try {
        const { name, environment, description } = req.body;
        if (!name || !environment) {
            res.status(400).json({ error: 'Name and environment required' });
            return;
        }
        const result = await pool_1.default.query('INSERT INTO clusters (name, environment, description, created_by) VALUES ($1,$2,$3,$4) RETURNING *', [name, environment, description || null, req.user.id]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'Cluster name already exists' });
            return;
        }
        res.status(500).json({ error: `Failed to create cluster: ${err.message}` });
    }
});
// PUT /clusters/:id
router.put('/:id', (0, auth_1.requireRole)('admin', 'operator'), async (req, res) => {
    try {
        const { name, environment, description } = req.body;
        const result = await pool_1.default.query(`UPDATE clusters SET name=$1, environment=$2, description=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`, [name, environment, description || null, req.params.id]);
        if (!result.rows[0]) {
            res.status(404).json({ error: 'Cluster not found' });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: `Failed to update cluster: ${err.message}` });
    }
});
// DELETE /clusters/:id
router.delete('/:id', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const result = await pool_1.default.query('DELETE FROM clusters WHERE id=$1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) {
            res.status(404).json({ error: 'Cluster not found' });
            return;
        }
        res.json({ message: 'Cluster deleted' });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to delete cluster: ${err.message}` });
    }
});
exports.default = router;
//# sourceMappingURL=clusters.js.map