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
// GET /images
router.get('/', async (req, res) => {
    try {
        const { q, limit = 50, offset = 0 } = req.query;
        const params = [];
        let where = 'WHERE 1=1';
        if (q) {
            params.push(`%${q}%`);
            where += ` AND (i.repository ILIKE $${params.length} OR i.tag ILIKE $${params.length})`;
        }
        params.push(limit, offset);
        const result = await pool_1.default.query(`
      SELECT i.id, i.repository, i.tag, i.digest, i.size_bytes, i.created_date, i.created_at,
        i.repository || ':' || i.tag as full_name,
        COUNT(DISTINCT ni.node_id) as node_count
      FROM images i
      LEFT JOIN node_images ni ON ni.image_id = i.id
      ${where}
      GROUP BY i.id ORDER BY i.repository, i.tag
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
        const countParams = q ? [`%${q}%`] : [];
        const countWhere = q ? 'WHERE repository ILIKE $1 OR tag ILIKE $1' : '';
        const countResult = await pool_1.default.query(`SELECT COUNT(*) FROM images ${countWhere}`, countParams);
        res.json({ images: result.rows, total: parseInt(countResult.rows[0].count) });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to fetch images: ${err.message}` });
    }
});
// GET /images/inventory
router.get('/inventory', async (_req, res) => {
    try {
        const clusters = await pool_1.default.query('SELECT * FROM clusters ORDER BY environment, name');
        const images = await pool_1.default.query(`
      SELECT DISTINCT i.id, i.repository, i.tag, i.size_bytes,
        i.repository || ':' || i.tag as full_name
      FROM images i JOIN node_images ni ON ni.image_id = i.id
      ORDER BY i.repository, i.tag
    `);
        const presence = await pool_1.default.query(`
      SELECT ni.image_id, n.cluster_id FROM node_images ni JOIN nodes n ON n.id = ni.node_id
    `);
        const presentSet = new Set(presence.rows.map((r) => `${r.image_id}:${r.cluster_id}`));
        const rows = images.rows.map((img) => ({
            ...img,
            clusters: clusters.rows.map((c) => ({
                cluster_id: c.id, cluster_name: c.name, environment: c.environment,
                present: presentSet.has(`${img.id}:${c.id}`),
            })),
        }));
        res.json({ clusters: clusters.rows, images: rows });
    }
    catch (err) {
        res.status(500).json({ error: `Inventory error: ${err.message}` });
    }
});
// GET /images/:id/locations
router.get('/:id/locations', async (req, res) => {
    try {
        const result = await pool_1.default.query(`
      SELECT n.id as node_id, n.name as node_name, n.ip_address, n.node_type,
        c.id as cluster_id, c.name as cluster_name, c.environment, ni.synced_at
      FROM node_images ni
      JOIN nodes n ON n.id = ni.node_id
      JOIN clusters c ON c.id = n.cluster_id
      WHERE ni.image_id = $1 ORDER BY c.environment, n.name
    `, [req.params.id]);
        res.json({ locations: result.rows });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to fetch locations: ${err.message}` });
    }
});
exports.default = router;
//# sourceMappingURL=images.js.map