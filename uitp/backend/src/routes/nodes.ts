import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { sshService } from '../services/sshService';

const router = Router();
router.use(authenticate);

// GET /nodes
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clusterId } = req.query;
    const params: any[] = [];
    let where = 'WHERE n.is_active = true';
    if (clusterId) { params.push(clusterId); where += ` AND n.cluster_id = $${params.length}`; }
    const result = await pool.query(`
      SELECT n.id, n.cluster_id, n.name, n.ip_address, n.ssh_port, n.username,
             n.auth_type, n.node_type, n.is_active, n.last_synced_at, n.created_at,
             c.name as cluster_name, c.environment,
             COUNT(DISTINCT ni.image_id) as image_count
      FROM nodes n
      LEFT JOIN clusters c ON c.id = n.cluster_id
      LEFT JOIN node_images ni ON ni.node_id = n.id
      ${where}
      GROUP BY n.id, c.name, c.environment
      ORDER BY c.environment, c.name, n.name
    `, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch nodes: ${err.message}` });
  }
});

// GET /nodes/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.cluster_id, n.name, n.ip_address, n.ssh_port, n.username,
              n.auth_type, n.node_type, n.is_active, n.last_synced_at, n.created_at,
              c.name as cluster_name, c.environment
       FROM nodes n LEFT JOIN clusters c ON c.id = n.cluster_id
       WHERE n.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Node not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch node: ${err.message}` });
  }
});

// POST /nodes
router.post('/', requireRole('admin', 'operator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cluster_id, name, ip_address, ssh_port = 22, username,
            auth_type = 'password', password, ssh_key, node_type = 'docker' } = req.body;
    if (!cluster_id || !name || !ip_address || !username) {
      res.status(400).json({ error: 'cluster_id, name, ip_address, username required' }); return;
    }
    const password_enc = password ? encrypt(password) : null;
    const ssh_key_enc  = ssh_key  ? encrypt(ssh_key)  : null;
    const result = await pool.query(
      `INSERT INTO nodes (cluster_id, name, ip_address, ssh_port, username, auth_type,
                          password_enc, ssh_key_enc, node_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, cluster_id, name, ip_address, ssh_port, username, auth_type, node_type, is_active, created_at`,
      [cluster_id, name, ip_address, ssh_port, username, auth_type, password_enc, ssh_key_enc, node_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create node: ${err.message}` });
  }
});

// PUT /nodes/:id
router.put('/:id', requireRole('admin', 'operator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, ip_address, ssh_port, username, auth_type, password, ssh_key, node_type } = req.body;
    const password_enc = password ? encrypt(password) : null;
    const ssh_key_enc  = ssh_key  ? encrypt(ssh_key)  : null;
    const result = await pool.query(
      `UPDATE nodes SET name=$1, ip_address=$2, ssh_port=$3, username=$4, auth_type=$5,
         password_enc=COALESCE($6, password_enc),
         ssh_key_enc=COALESCE($7, ssh_key_enc),
         node_type=$8, updated_at=NOW()
       WHERE id=$9
       RETURNING id, name, ip_address, ssh_port, username, auth_type, node_type, is_active`,
      [name, ip_address, ssh_port, username, auth_type, password_enc, ssh_key_enc, node_type, req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Node not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to update node: ${err.message}` });
  }
});

// DELETE /nodes/:id
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query('UPDATE nodes SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Node deactivated' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to deactivate node: ${err.message}` });
  }
});

// POST /nodes/:id/test-connection
router.post('/:id/test-connection', requireRole('admin', 'operator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM nodes WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) { res.status(404).json({ error: 'Node not found' }); return; }
    const node = result.rows[0];
    await sshService.testConnection({
      host: node.ip_address, port: node.ssh_port, username: node.username,
      password: node.password_enc ? decrypt(node.password_enc) : undefined,
      privateKey: node.ssh_key_enc ? decrypt(node.ssh_key_enc) : undefined,
    });
    res.json({ success: true, message: 'Connection successful' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: `Connection failed: ${err.message}` });
  }
});

// POST /nodes/:id/sync
router.post('/:id/sync', requireRole('admin', 'operator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM nodes WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) { res.status(404).json({ error: 'Node not found' }); return; }
    const node = result.rows[0];
    const images = await sshService.listImages({
      host: node.ip_address, port: node.ssh_port, username: node.username,
      password: node.password_enc ? decrypt(node.password_enc) : undefined,
      privateKey: node.ssh_key_enc ? decrypt(node.ssh_key_enc) : undefined,
    }, node.node_type);

    let synced = 0;
    for (const img of images) {
      const imageResult = await pool.query(
        `INSERT INTO images (repository, tag, size_bytes)
         VALUES ($1,$2,$3)
         ON CONFLICT (repository, tag) DO UPDATE SET size_bytes=EXCLUDED.size_bytes, updated_at=NOW()
         RETURNING id`,
        [img.repository, img.tag, img.size_bytes || null]
      );
      await pool.query(
        `INSERT INTO node_images (node_id, image_id, image_id_raw)
         VALUES ($1,$2,$3) ON CONFLICT (node_id, image_id) DO UPDATE SET synced_at=NOW()`,
        [node.id, imageResult.rows[0].id, img.image_id_on_node || null]
      );
      synced++;
    }
    await pool.query('UPDATE nodes SET last_synced_at=NOW() WHERE id=$1', [node.id]);
    res.json({ success: true, synced, message: `Synced ${synced} images` });
  } catch (err: any) {
    res.status(500).json({ error: `Sync failed: ${err.message}` });
  }
});

export default router;
