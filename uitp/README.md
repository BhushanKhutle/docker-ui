# Universal Image Transfer Portal (UITP)

A centralized web application for manually transferring Docker/containerd images between
Kubernetes clusters and standalone Docker hosts across DEV / UAT / PP / PROD / DR environments.

> **Images are never transferred automatically.** Every transfer is user-initiated.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18 + Vite + TypeScript + Material UI v5   |
| Backend    | Node.js 20 + Express + TypeScript               |
| Database   | PostgreSQL 16                                   |
| Real-time  | WebSocket (ws)                                  |
| SSH/SCP    | node-ssh                                        |
| Auth       | JWT + bcrypt                                    |
| Container  | Docker + Docker Compose                         |

---

## Project Layout

```
uitp/
├── backend/
│   ├── src/
│   │   ├── db/          # PostgreSQL pool
│   │   ├── middleware/  # JWT auth, RBAC
│   │   ├── routes/      # REST API handlers
│   │   ├── services/    # SSH / image-transfer logic
│   │   ├── types/       # Shared TypeScript interfaces
│   │   ├── utils/       # AES encryption helpers
│   │   ├── websocket/   # WS server + broadcast
│   │   └── index.ts     # Express entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios client + API modules
│   │   ├── components/  # Layout, shared components
│   │   ├── pages/       # All route pages
│   │   ├── store/       # Zustand auth store
│   │   ├── types/       # Frontend TypeScript types
│   │   ├── utils/       # formatBytes, etc.
│   │   ├── App.tsx      # Router + PrivateRoute guard
│   │   ├── main.tsx
│   │   └── theme.ts     # Dark MUI theme
│   ├── package.json
│   └── vite.config.ts
├── database/
│   └── init.sql         # Schema + seed (runs once on first pg start)
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start (Docker Compose)

### 1 — Prerequisites

- Docker ≥ 24
- Docker Compose ≥ 2.22

### 2 — Clone and configure

```bash
git clone <repo-url> uitp
cd uitp
cp .env.example .env
```

Edit `.env` — at minimum change these three secrets:

```dotenv
DB_PASSWORD=your_strong_db_password
JWT_SECRET=<openssl rand -hex 64>
ENCRYPTION_KEY=<openssl rand -hex 32>
```

### 3 — Build and start

```bash
docker compose up -d --build
```

Services:
- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:4000
- **PostgreSQL** → localhost:5432 (internal only)

### 4 — Login

| Username   | Password   | Role     |
|------------|------------|----------|
| `admin`    | `admin123` | Admin    |
| `operator` | `admin123` | Operator |

> **Change default passwords immediately after first login** via Settings → Users.

### 5 — Tear down

```bash
docker compose down          # keep data
docker compose down -v       # remove volumes (wipes DB)
```

---

## Local Development

### Backend

```bash
cd backend
npm install
cp ../.env.example .env      # point DB_HOST=localhost
npm run dev                  # ts-node-dev hot reload on :4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # Vite dev server on :5173
                             # /api and /ws proxied to :4000
```

---

## API Reference

| Method | Path                          | Auth | Description                        |
|--------|-------------------------------|------|------------------------------------|
| POST   | `/api/auth/login`             | —    | Login, returns JWT                 |
| GET    | `/api/auth/me`                | ✓    | Current user                       |
| GET    | `/api/dashboard`              | ✓    | Aggregated stats                   |
| GET    | `/api/clusters`               | ✓    | List clusters                      |
| POST   | `/api/clusters`               | ✓    | Create cluster                     |
| PUT    | `/api/clusters/:id`           | ✓    | Update cluster                     |
| DELETE | `/api/clusters/:id`           | ✓    | Delete cluster                     |
| GET    | `/api/nodes`                  | ✓    | List nodes (optional ?clusterId=)  |
| POST   | `/api/nodes`                  | ✓    | Add node                           |
| POST   | `/api/nodes/:id/test-connection` | ✓ | SSH connectivity test              |
| POST   | `/api/nodes/:id/sync`         | ✓    | Pull image list via SSH            |
| GET    | `/api/images`                 | ✓    | List images (optional ?q=)         |
| GET    | `/api/images/inventory`       | ✓    | Matrix: images × clusters          |
| GET    | `/api/images/:id/locations`   | ✓    | Nodes that have the image          |
| GET    | `/api/transfers`              | ✓    | Transfer history                   |
| POST   | `/api/transfers`              | ✓    | Initiate transfer                  |
| GET    | `/api/transfers/:id`          | ✓    | Transfer detail + logs             |

### WebSocket

Connect: `ws://localhost:4000?token=<JWT>`

Events emitted by server:

```json
{ "type": "transfer_update", "data": { "id": 42, "status": "running", "log": "..." } }
{ "type": "transfer_complete", "data": { "id": 42, "status": "completed" } }
{ "type": "transfer_failed",   "data": { "id": 42, "error": "..." } }
```

---

## Transfer Mechanics

Transfer steps executed server-side over SSH:

### Docker → Docker

```bash
# 1. Save on source node
docker save <image>:<tag> -o /tmp/uitp-<uuid>.tar

# 2. SCP tar from source → backend controller → destination
scp source:/tmp/uitp-<uuid>.tar /tmp/uitp-<uuid>.tar
scp /tmp/uitp-<uuid>.tar dest:/tmp/uitp-<uuid>.tar

# 3. Load on destination
docker load -i /tmp/uitp-<uuid>.tar

# 4. Cleanup temp files on both ends
```

### containerd → containerd

```bash
ctr -n k8s.io images export /tmp/uitp-<uuid>.tar <image>:<tag>
# ... SCP ...
ctr -n k8s.io images import /tmp/uitp-<uuid>.tar
```

Progress is broadcast in real-time via WebSocket.

---

## Security Notes

- SSH passwords and keys are stored **AES-256 encrypted** in PostgreSQL.
- Set a strong, random `ENCRYPTION_KEY` in production — losing it means stored credentials become unreadable.
- JWT tokens expire after 24 hours (configurable via `JWT_EXPIRES_IN`).
- The backend sets `StrictHostKeyChecking no` in its SSH config for convenience; for production, pre-populate `/root/.ssh/known_hosts` inside the container.
- All API routes (except `/api/auth/login`) require a valid JWT.

---

## RBAC

| Action                | Admin | Operator | Readonly |
|-----------------------|-------|----------|----------|
| View dashboard/images | ✓     | ✓        | ✓        |
| Initiate transfers    | ✓     | ✓        | ✗        |
| Add/edit clusters     | ✓     | ✓        | ✗        |
| Add/edit nodes        | ✓     | ✓        | ✗        |
| Sync node images      | ✓     | ✓        | ✗        |
| Manage users          | ✓     | ✗        | ✗        |

---

## Environment Variables

| Variable        | Required | Default     | Description                             |
|-----------------|----------|-------------|-----------------------------------------|
| `DB_HOST`       | Yes      | `postgres`  | PostgreSQL host                         |
| `DB_PORT`       | No       | `5432`      | PostgreSQL port                         |
| `DB_NAME`       | Yes      | `uitp`      | Database name                           |
| `DB_USER`       | Yes      | `uitp`      | Database user                           |
| `DB_PASSWORD`   | Yes      | —           | Database password                       |
| `JWT_SECRET`    | Yes      | —           | JWT signing secret (≥64 chars)          |
| `JWT_EXPIRES_IN`| No       | `24h`       | Token lifetime                          |
| `ENCRYPTION_KEY`| Yes      | —           | AES key for SSH credentials (32-byte hex)|
| `PORT`          | No       | `4000`      | Backend port                            |
| `NODE_ENV`      | No       | `production`| `development` enables verbose logging   |
| `CORS_ORIGIN`   | No       | `*`         | Allowed CORS origins (comma-separated)  |

---

## UI Pages

| Page            | Path          | Description                                    |
|-----------------|---------------|------------------------------------------------|
| Dashboard       | `/`           | Stats cards + recent transfers                 |
| Clusters        | `/clusters`   | Register and manage clusters                   |
| Nodes           | `/nodes`      | Add nodes, test SSH, sync images               |
| Images          | `/images`     | Global image search + details drawer           |
| Inventory       | `/inventory`  | Image × cluster matrix (✓/✗ presence)          |
| Transfer        | `/transfer`   | 3-step wizard: image → source → destinations   |
| History         | `/history`    | Paginated transfer log with status filter      |
| Settings        | `/settings`   | User management (admin), system info           |
