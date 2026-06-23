-- ============================================================
-- UITP — Universal Image Transfer Portal
-- Database initialization: schema + seed data
-- ============================================================

-- Enums
CREATE TYPE environment_type AS ENUM ('DEV', 'UAT', 'PP', 'PROD', 'DR');
CREATE TYPE node_type        AS ENUM ('kubernetes', 'docker', 'containerd');
CREATE TYPE transfer_status  AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE user_role        AS ENUM ('admin', 'operator', 'readonly');
CREATE TYPE auth_type        AS ENUM ('password', 'ssh_key');

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'readonly',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Clusters ──────────────────────────────────────────────────
CREATE TABLE clusters (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(128)     NOT NULL UNIQUE,
  environment environment_type NOT NULL,
  description TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Nodes ─────────────────────────────────────────────────────
CREATE TABLE nodes (
  id              SERIAL PRIMARY KEY,
  cluster_id      INTEGER     NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,
  ip_address      VARCHAR(45)  NOT NULL,
  ssh_port        INTEGER      NOT NULL DEFAULT 22,
  username        VARCHAR(64)  NOT NULL,
  auth_type       auth_type    NOT NULL DEFAULT 'password',
  password_enc    TEXT,                         -- AES-encrypted
  ssh_key_enc     TEXT,                         -- AES-encrypted
  node_type       node_type    NOT NULL DEFAULT 'docker',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(cluster_id, name)
);

-- ── Images ────────────────────────────────────────────────────
CREATE TABLE images (
  id           SERIAL PRIMARY KEY,
  repository   VARCHAR(512) NOT NULL,
  tag          VARCHAR(128) NOT NULL DEFAULT 'latest',
  digest       VARCHAR(256),
  size_bytes   BIGINT,
  created_date TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(repository, tag)
);

-- ── Node ↔ Image mapping ─────────────────────────────────────
CREATE TABLE node_images (
  id           SERIAL PRIMARY KEY,
  node_id      INTEGER NOT NULL REFERENCES nodes(id)  ON DELETE CASCADE,
  image_id     INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  image_id_raw VARCHAR(256),   -- full ID as reported by container engine
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(node_id, image_id)
);

-- ── Transfers ─────────────────────────────────────────────────
CREATE TABLE transfers (
  id              SERIAL PRIMARY KEY,
  image_id        INTEGER      NOT NULL REFERENCES images(id) ON DELETE RESTRICT,
  source_node_id  INTEGER      NOT NULL REFERENCES nodes(id)  ON DELETE RESTRICT,
  dest_node_id    INTEGER      NOT NULL REFERENCES nodes(id)  ON DELETE RESTRICT,
  status          transfer_status NOT NULL DEFAULT 'pending',
  initiated_by    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  log_output      TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit log ─────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64),
  entity_id   INTEGER,
  details     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_nodes_cluster      ON nodes(cluster_id);
CREATE INDEX idx_node_images_node   ON node_images(node_id);
CREATE INDEX idx_node_images_image  ON node_images(image_id);
CREATE INDEX idx_transfers_image    ON transfers(image_id);
CREATE INDEX idx_transfers_status   ON transfers(status);
CREATE INDEX idx_transfers_created  ON transfers(created_at DESC);
CREATE INDEX idx_audit_user         ON audit_logs(user_id);
CREATE INDEX idx_audit_created      ON audit_logs(created_at DESC);
CREATE INDEX idx_images_repo_tag    ON images(repository, tag);

-- ── Updated-at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clusters_updated BEFORE UPDATE ON clusters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_nodes_updated    BEFORE UPDATE ON nodes    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_images_updated   BEFORE UPDATE ON images   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Seed: default admin user
-- username : admin
-- password : admin123   (bcrypt cost=12)
-- ============================================================
INSERT INTO users (username, email, password_hash, role)
VALUES (
  'admin',
  'admin@uitp.local',
  '$2b$12$L.wxDeKyOxMgOs6mzWQ3Ve22Nu5UwN8LdPzWBXFz/nXd9movtGFDK',
  'admin'
);

-- Seed: demo operator
INSERT INTO users (username, email, password_hash, role)
VALUES (
  'operator',
  'operator@uitp.local',
  '$2b$12$L.wxDeKyOxMgOs6mzWQ3Ve22Nu5UwN8LdPzWBXFz/nXd9movtGFDK',
  'operator'
);
