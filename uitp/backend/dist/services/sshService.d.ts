import { NodeType, SSHConnectionConfig } from '../types';
export interface ImageInfo {
    repository: string;
    tag: string;
    digest?: string;
    size_bytes?: number;
    created_date?: string;
    image_id_on_node?: string;
}
export declare class SSHService {
    private getConnection;
    testConnection(config: SSHConnectionConfig): Promise<boolean>;
    listImages(config: SSHConnectionConfig, nodeType: NodeType): Promise<ImageInfo[]>;
    private listDockerImages;
    private listContainerdImages;
    transferImage(sourceConfig: SSHConnectionConfig, sourceNodeType: NodeType, destConfig: SSHConnectionConfig, destNodeType: NodeType, imageName: string, onLog: (log: string) => void): Promise<void>;
    private parseDockerSize;
    private parseContainerdSize;
    private formatBytes;
}
export declare const sshService: SSHService;
//# sourceMappingURL=sshService.d.ts.map