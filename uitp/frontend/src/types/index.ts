export type EnvironmentType = 'DEV' | 'UAT' | 'PP' | 'PROD' | 'DR';
export type NodeType = 'kubernetes' | 'docker' | 'containerd';
export type TransferStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type UserRole = 'admin' | 'operator' | 'readonly';
export type AuthType = 'password' | 'ssh_key';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Cluster {
  id: string;
  name: string;
  environment: EnvironmentType;
  description?: string;
  is_active: boolean;
  node_count: number;
  image_count: number;
  created_at: string;
}

export interface Node {
  id: string;
  cluster_id: string;
  cluster_name: string;
  environment: EnvironmentType;
  name: string;
  ip_address: string;
  ssh_port: number;
  username: string;
  auth_type: AuthType;
  node_type: NodeType;
  is_active: boolean;
  last_sync_at?: string;
  image_count: number;
  created_at: string;
}

export interface Image {
  id: string;
  repository: string;
  tag: string;
  full_name: string;
  digest?: string;
  size_bytes?: number;
  created_date?: string;
  node_count: number;
  cluster_names: string[];
  environments: EnvironmentType[];
  created_at: string;
}

export interface ImageLocation {
  image_id: string;
  image_name: string;
  present_nodes: NodeRef[];
  missing_nodes: NodeRef[];
}

export interface NodeRef {
  node_id: string;
  node_name: string;
  cluster_id: string;
  cluster_name: string;
  environment: EnvironmentType;
  node_type: NodeType;
}

export interface Transfer {
  id: string;
  image_name: string;
  source_node_name: string;
  destination_node_name: string;
  source_cluster_name: string;
  destination_cluster_name: string;
  source_environment: EnvironmentType;
  destination_environment: EnvironmentType;
  status: TransferStatus;
  initiated_by_username?: string;
  duration_seconds?: number;
  error_message?: string;
  logs?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface DashboardStats {
  total_clusters: number;
  total_nodes: number;
  total_images: number;
  unique_images: number;
  transfer_stats_24h: {
    success: number;
    failed: number;
    running: number;
    pending: number;
  };
  recent_transfers: Transfer[];
}

export interface InventoryCluster {
  id: string;
  name: string;
  environment: EnvironmentType;
}

export interface InventoryRow {
  id: string;
  full_name: string;
  repository: string;
  tag: string;
  size_bytes?: number;
  presence: Record<string, boolean>;
}

export interface Inventory {
  clusters: InventoryCluster[];
  inventory: InventoryRow[];
}
