"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../middleware/auth");
const encryption_1 = require("../utils/encryption");
const sshService_1 = require("../services/sshService");
const wsServer_1 = require("../websocket/wsServer");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const TRANSFER_SELECT = `
  SELECT t.*,
    sn.name as source_node_name, sn.ip_address as source_node_ip,
    dn.name as destination_node_name, dn.ip_address as destination_node_ip,
    sc.name as source_cluster_name, sc.environment as source_environment,
    dc.name as destination_cluster_name, dc.environment as destination_environment,
    u.username as initiated_by_username,
    i.repository || ':' || i.tag as image_name
  FROM transfers t
  LEFT JOIN nodes sn ON sn.id = t.source_node_id
  LEFT JOIN nodes dn ON dn.id = t.dest_node_id
  LEFT JOIN clusters sc ON sc.id = sn.cluster_id
  LEFT JOIN clusters dc ON dc.id = dn.cluster_id
  LEFT JOIN users u ON u.id = t.initiated_by
  LEFT JOIN images i ON i.id = t.image_id
`;
// GET /transfers
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, status } = req.query;
        const params = [];
        let where = 'WHERE 1=1';
        if (status) {
            params.push(status);
            where += ` AND t.status = $${params.length}`;
        }
        params.push(limit, offset);
        const result = await pool_1.default.query(`${TRANSFER_SELECT} ${where} ORDER BY t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        const countResult = await pool_1.default.query('SELECT COUNT(*) FROM transfers' + (status ? ' WHERE status=$1' : ''), status ? [status] : []);
        res.json({ transfers: result.rows, total: parseInt(countResult.rows[0].count) });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to fetch transfers: ${err.message}` });
    }
});
// POST /transfers
router.post('/', (0, auth_1.requireRole)('admin', 'operator'), async (req, res) => {
    try {
        const { image_id, source_node_id, destination_node_ids } = req.body;
        if (!image_id || !source_node_id || !destination_node_ids?.length) {
            res.status(400).json({ error: 'image_id, source_node_id, destination_node_ids required' });
            return;
        }
        const imageResult = await pool_1.default.query('SELECT * FROM images WHERE id=$1', [image_id]);
        if (!imageResult.rows[0]) {
            res.status(404).json({ error: 'Image not found' });
            return;
        }
        const image = imageResult.rows[0];
        const imageName = `${image.repository}:${image.tag}`;
        const sourceResult = await pool_1.default.query('SELECT * FROM nodes WHERE id=$1', [source_node_id]);
        if (!sourceResult.rows[0]) {
            res.status(404).json({ error: 'Source node not found' });
            return;
        }
        const sourceNode = sourceResult.rows[0];
        const transferIds = [];
        for (const destNodeId of destination_node_ids) {
            const r = await pool_1.default.query(`INSERT INTO transfers (image_id, source_node_id, dest_node_id, status, initiated_by)
         VALUES ($1,$2,$3,'pending',$4) RETURNING id`, [image_id, source_node_id, destNodeId, req.user.id]);
            transferIds.push(r.rows[0].id);
        }
        for (let i = 0; i < transferIds.length; i++) {
            executeTransfer(transferIds[i], image_id, imageName, sourceNode, destination_node_ids[i]);
        }
        res.status(202).json({ message: 'Transfers initiated', transfer_ids: transferIds });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to initiate transfer: ${err.message}` });
    }
});
// GET /transfers/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query(`${TRANSFER_SELECT} WHERE t.id=$1`, [req.params.id]);
        if (!result.rows[0]) {
            res.status(404).json({ error: 'Transfer not found' });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: `Failed to fetch transfer: ${err.message}` });
    }
});
// POST /transfers/:id/cancel
router.post('/:id/cancel', (0, auth_1.requireRole)('admin', 'operator'), async (req, res) => {
    try {
        const result = await pool_1.default.query(`UPDATE transfers SET status='cancelled', completed_at=NOW() WHERE id=$1 AND status='pending' RETURNING id`, [req.params.id]);
        if (!result.rows[0]) {
            res.status(400).json({ error: 'Transfer cannot be cancelled' });
            return;
        }
        res.json({ message: 'Transfer cancelled' });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to cancel: ${err.message}` });
    }
});
async function executeTransfer(transferId, imageId, imageName, sourceNode, destNodeId) {
    const wss = (0, wsServer_1.getWebSocketServer)();
    const broadcast = (type, data) => wss?.broadcast({ type, transferId, ...data });
    const startTime = Date.now();
    try {
        await pool_1.default.query("UPDATE transfers SET status='running', started_at=NOW() WHERE id=$1", [transferId]);
        broadcast('transfer:start', { imageName });
        const destResult = await pool_1.default.query('SELECT * FROM nodes WHERE id=$1', [destNodeId]);
        const destNode = destResult.rows[0];
        if (!destNode)
            throw new Error('Destination node not found');
        const sourceConfig = {
            host: sourceNode.ip_address, port: sourceNode.ssh_port, username: sourceNode.username,
            password: sourceNode.password_enc ? (0, encryption_1.decrypt)(sourceNode.password_enc) : undefined,
            privateKey: sourceNode.ssh_key_enc ? (0, encryption_1.decrypt)(sourceNode.ssh_key_enc) : undefined,
        };
        const destConfig = {
            host: destNode.ip_address, port: destNode.ssh_port, username: destNode.username,
            password: destNode.password_enc ? (0, encryption_1.decrypt)(destNode.password_enc) : undefined,
            privateKey: destNode.ssh_key_enc ? (0, encryption_1.decrypt)(destNode.ssh_key_enc) : undefined,
        };
        let logs = '';
        await sshService_1.sshService.transferImage(sourceConfig, sourceNode.node_type, destConfig, destNode.node_type, imageName, (log) => { logs += log + '\n'; broadcast('transfer:log', { log }); });
        const duration_ms = Date.now() - startTime;
        await pool_1.default.query(`UPDATE transfers SET status='completed', completed_at=NOW(), duration_ms=$1, log_output=$2 WHERE id=$3`, [duration_ms, logs, transferId]);
        await pool_1.default.query(`INSERT INTO node_images (node_id, image_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [destNodeId, imageId]);
        broadcast('transfer:complete', { duration_ms, status: 'completed' });
    }
    catch (err) {
        const duration_ms = Date.now() - startTime;
        await pool_1.default.query(`UPDATE transfers SET status='failed', completed_at=NOW(), duration_ms=$1, error_message=$2 WHERE id=$3`, [duration_ms, err.message, transferId]);
        broadcast('transfer:error', { error: err.message });
    }
}
exports.default = router;
//# sourceMappingURL=transfers.js.map