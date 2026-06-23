#!/usr/bin/env python3
"""
UITP Patch 5 — Fix TS errors + run with PM2 (no Docker build)
Run: python3 patch5.py
"""
import os, subprocess, sys, time, shutil

BASE = "/home/ec2-user/docker-ui/uitp"
BACKEND = f"{BASE}/backend"
FRONTEND = f"{BASE}/frontend"

def write(rel, content):
    path = f"{BASE}/{rel}"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print(f"  ✔ wrote {rel}")

def run(cmd, cwd=BASE, check=True):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if check and r.returncode != 0:
        print(f"  ✘ FAILED: {cmd}\n{r.stdout[-800:]}\n{r.stderr[-800:]}")
        sys.exit(1)
    return r.stdout.strip()

def run_live(cmd, cwd=BASE):
    r = subprocess.run(cmd, shell=True, cwd=cwd)
    if r.returncode != 0:
        print(f"  ✘ FAILED: {cmd}")
        sys.exit(1)

# ── 0. Stop existing docker services (keep postgres) ─────────────────────────
print("\n[0] Stopping Docker app containers (keeping postgres) ...")
subprocess.run("docker stop uitp-backend uitp-frontend 2>/dev/null", shell=True)
subprocess.run("docker rm uitp-backend uitp-frontend 2>/dev/null", shell=True)
print("  ✔ App containers stopped")

# ── 1. Fix nodes.ts sync — use correct ImageInfo fields ──────────────────────
print("\n[1] Fixing nodes.ts ImageInfo field names ...")
write("backend/src/routes/nodes.ts", """\
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
""")

# ── 2. Read DB creds from running postgres container ─────────────────────────
print("\n[2] Reading DB credentials from running postgres container ...")
db_user = run("docker exec uitp-postgres printenv POSTGRES_USER", check=False) or "uitp"
db_pass = run("docker exec uitp-postgres printenv POSTGRES_PASSWORD", check=False) or "uitp_secret_change_me"
db_name = run("docker exec uitp-postgres printenv POSTGRES_DB", check=False) or "uitp"
db_host = "localhost"
# Get host port postgres is mapped to (default 5432 internal, need to publish it)
print(f"  DB: {db_user}@{db_host}/{db_name}")

# ── 3. Expose postgres port to host (restart with port mapping) ───────────────
print("\n[3] Ensuring postgres is accessible on localhost:5432 ...")
pg_port = run("docker port uitp-postgres 5432 2>/dev/null", check=False)
if not pg_port:
    print("  Postgres port not exposed — restarting with -p 5432:5432 ...")
    run("docker stop uitp-postgres", check=False)
    run("docker rm uitp-postgres", check=False)
    run(f"""docker run -d --name uitp-postgres \
        -e POSTGRES_DB={db_name} \
        -e POSTGRES_USER={db_user} \
        -e POSTGRES_PASSWORD={db_pass} \
        -v uitp-postgres-data:/var/lib/postgresql/data \
        -p 5432:5432 \
        postgres:16-alpine""")
    print("  Waiting for postgres to be ready ...")
    time.sleep(6)
else:
    print(f"  ✔ Postgres already exposed at {pg_port}")

# ── 4. Create .env for backend ────────────────────────────────────────────────
print("\n[4] Writing backend .env ...")
import secrets as sec

env_path = f"{BACKEND}/.env"
# Try to reuse existing secrets if .env exists at root
root_env = {}
if os.path.exists(f"{BASE}/.env"):
    for line in open(f"{BASE}/.env"):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            root_env[k.strip()] = v.strip()

jwt_secret    = root_env.get("JWT_SECRET") or sec.token_hex(64)
enc_key       = root_env.get("ENCRYPTION_KEY") or sec.token_hex(32)
db_pass_final = root_env.get("DB_PASSWORD") or db_pass

with open(env_path, "w") as f:
    f.write(f"""DB_HOST={db_host}
DB_PORT=5432
DB_NAME={db_name}
DB_USER={db_user}
DB_PASSWORD={db_pass_final}
JWT_SECRET={jwt_secret}
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY={enc_key}
PORT=4000
NODE_ENV=production
CORS_ORIGIN=*
""")
print(f"  ✔ {env_path}")

# ── 5. Install backend deps + build ──────────────────────────────────────────
print("\n[5] Installing backend dependencies ...")
run_live("npm install", cwd=BACKEND)
print("\n[6] Building backend TypeScript ...")
run_live("npm run build", cwd=BACKEND)

# ── 6. Install frontend deps + build ─────────────────────────────────────────
print("\n[7] Installing frontend dependencies ...")
run_live("npm install", cwd=FRONTEND)
print("\n[8] Building frontend ...")
run_live("npm run build", cwd=FRONTEND)

# ── 7. Install serve + pm2 if missing ────────────────────────────────────────
print("\n[9] Ensuring PM2 and serve are installed ...")
run("npm install -g pm2 serve 2>/dev/null || true", check=False)

# ── 8. Create PM2 ecosystem file ─────────────────────────────────────────────
print("[10] Writing PM2 ecosystem config ...")
write("ecosystem.config.js", f"""\
module.exports = {{
  apps: [
    {{
      name: 'uitp-backend',
      script: 'dist/index.js',
      cwd: '{BACKEND}',
      env_file: '{BACKEND}/.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/tmp/uitp-backend-err.log',
      out_file:   '/tmp/uitp-backend-out.log',
    }},
    {{
      name: 'uitp-frontend',
      script: 'serve',
      args: '-s dist -l 3000',
      cwd: '{FRONTEND}',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: '/tmp/uitp-frontend-err.log',
      out_file:   '/tmp/uitp-frontend-out.log',
    }},
  ],
}};
""")

# ── 9. Start with PM2 ────────────────────────────────────────────────────────
print("\n[11] Starting with PM2 ...")
subprocess.run("pm2 delete uitp-backend uitp-frontend 2>/dev/null", shell=True)
run_live(f"pm2 start {BASE}/ecosystem.config.js")
run("pm2 save", check=False)

time.sleep(4)

# ── 10. Health check ──────────────────────────────────────────────────────────
print("\n[12] Health check ...")
r = subprocess.run(
    """TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
         -H 'Content-Type: application/json' \
         -d '{"username":"admin","password":"admin123"}' | \
         python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token",""))') && \
       curl -s -w "\\nHTTP %{http_code}" http://localhost:4000/api/clusters \
         -H "Authorization: Bearer $TOKEN" """,
    shell=True, capture_output=True, text=True
)
print(f"  {r.stdout[-300:]}")

print("\n[13] PM2 status:")
subprocess.run("pm2 list", shell=True)

print("\n" + "="*55)
print("  UITP running via PM2 (no Docker build needed!)")
print(f"  Frontend : http://<ec2-ip>:3000")
print(f"  API      : http://<ec2-ip>:4000")
print(f"  Logs     : pm2 logs")
print("="*55 + "\n")
