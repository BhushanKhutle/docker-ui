-- Universal Image Transfer Portal Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE environment_type AS ENUM ('DEV', 'UAT', 'PP', 'PROD', 'DR');
CREATE TYPE node_type AS ENUM ('kubernetes', 'docker', 'containerd');
CREATE TYPE transfer_status AS ENUM ('pending', 'running', 'success', 'failed', 'cancelled');
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'readonly');
CREATE TYPE auth_type AS ENUM ('password', 'ssh_key');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'readonly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clusters
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  environment environment_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nodes
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  ssh_port INTEGER DEFAULT 22,
  username VARCHAR(100) NOT NULL,
  auth_type auth_type NOT NULL DEFAULT 'password',
  password_encrypted TEXT,
  ssh_key_encrypted TEXT,
  node_type node_type NOT NULL DEFAULT 'docker',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Images (deduplicated by name:tag)
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository VARCHAR(512) NOT NULL,
  tag VARCHAR(255) NOT NULL DEFAULT 'latest',
  full_name VARCHAR(768) GENERATED ALWAYS AS (repository || ':' || tag) STORED,
  digest VARCHAR(255),
  size_bytes BIGINT,
  created_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository, tag)
);

-- Node-Image mapping (which images exist on which nodes)
CREATE TABLE node_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  image_id_on_node VARCHAR(255),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(node_id, image_id)
);

-- Transfer jobs
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID REFERENCES images(id),
  image_name VARCHAR(768) NOT NULL,
  source_node_id UUID REFERENCES nodes(id),
  destination_node_id UUID REFERENCES nodes(id),
  source_cluster_id UUID REFERENCES clusters(id),
  destination_cluster_id UUID REFERENCES clusters(id),
  status transfer_status DEFAULT 'pending',
  initiated_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  error_message TEXT,
  logs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_node_images_node ON node_images(node_id);
CREATE INDEX idx_node_images_image ON node_images(image_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_created ON transfers(created_at DESC);
CREATE INDEX idx_images_full_name ON images(full_name);
CREATE INDEX idx_nodes_cluster ON nodes(cluster_id);

-- Default admin user (password: admin123 - change in production)
INSERT INTO users (username, email, password_hash, role)
VALUES (
  'admin',
  'admin@uitp.local',
  '$2b$10$rOzJqhqhqhqhqhqhqhqhquHello.World.Hash.Replace.Me',
  'admin'
);
