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
    created_at: Date;
}
export interface Cluster {
    id: string;
    name: string;
    environment: EnvironmentType;
    description?: string;
    is_active: boolean;
    node_count?: number;
    created_at: Date;
    updated_at: Date;
}
export interface Node {
    id: string;
    cluster_id: string;
    cluster_name?: string;
    environment?: EnvironmentType;
    name: string;
    ip_address: string;
    ssh_port: number;
    username: string;
    auth_type: AuthType;
    password_encrypted?: string;
    ssh_key_encrypted?: string;
    node_type: NodeType;
    is_active: boolean;
    last_sync_at?: Date;
    image_count?: number;
    created_at: Date;
}
export interface Image {
    id: string;
    repository: string;
    tag: string;
    full_name: string;
    digest?: string;
    size_bytes?: number;
    created_date?: Date;
    node_count?: number;
    cluster_names?: string[];
    created_at: Date;
}
export interface NodeImage {
    id: string;
    node_id: string;
    image_id: string;
    image_id_on_node?: string;
    discovered_at: Date;
}
export interface Transfer {
    id: string;
    image_id?: string;
    image_name: string;
    source_node_id: string;
    destination_node_id: string;
    source_cluster_id?: string;
    destination_cluster_id?: string;
    source_node_name?: string;
    destination_node_name?: string;
    source_cluster_name?: string;
    destination_cluster_name?: string;
    status: TransferStatus;
    initiated_by?: string;
    initiated_by_username?: string;
    started_at?: Date;
    completed_at?: Date;
    duration_seconds?: number;
    error_message?: string;
    logs?: string;
    created_at: Date;
}
export interface ImageLocation {
    image_id: string;
    image_name: string;
    present_nodes: Array<{
        node_id: string;
        node_name: string;
        cluster_id: string;
        cluster_name: string;
        environment: EnvironmentType;
        node_type: NodeType;
    }>;
    missing_nodes: Array<{
        node_id: string;
        node_name: string;
        cluster_id: string;
        cluster_name: string;
        environment: EnvironmentType;
        node_type: NodeType;
    }>;
}
export interface TransferRequest {
    image_id: string;
    source_node_id: string;
    destination_node_ids: string[];
}
export interface SSHConnectionConfig {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
}
export interface DashboardStats {
    total_clusters: number;
    total_nodes: number;
    total_images: number;
    unique_images: number;
    recent_transfers: Transfer[];
    failed_transfers: number;
    success_transfers: number;
    transfer_stats_24h: {
        success: number;
        failed: number;
        running: number;
    };
}
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: UserRole;
    };
}
//# sourceMappingURL=index.d.ts.map