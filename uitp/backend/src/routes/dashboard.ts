import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [clusters, nodes, images, transferStats, recentTransfers] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM clusters'),
      pool.query('SELECT COUNT(*) FROM nodes WHERE is_active=true'),
      pool.query('SELECT COUNT(*) FROM images'),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status='completed') as completed,
          COUNT(*) FILTER (WHERE status='failed') as failed,
          COUNT(*) FILTER (WHERE status='running') as running
        FROM transfers
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      pool.query(`
        SELECT t.id, t.status, t.created_at, t.duration_ms,
          i.repository || ':' || i.tag as image_name,
          sn.name as source_node_name,
          dn.name as destination_node_name,
          sc.environment as source_environment,
          dc.environment as destination_environment
        FROM transfers t
        LEFT JOIN images i ON i.id = t.image_id
        LEFT JOIN nodes sn ON sn.id = t.source_node_id
        LEFT JOIN nodes dn ON dn.id = t.dest_node_id
        LEFT JOIN clusters sc ON sc.id = sn.cluster_id
        LEFT JOIN clusters dc ON dc.id = dn.cluster_id
        ORDER BY t.created_at DESC LIMIT 10
      `),
    ]);
    res.json({
      clusters: parseInt(clusters.rows[0].count),
      nodes: parseInt(nodes.rows[0].count),
      images: parseInt(images.rows[0].count),
      transfers_24h: transferStats.rows[0],
      recent_transfers: recentTransfers.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Dashboard error: ${err.message}` });
  }
});

export default router;
