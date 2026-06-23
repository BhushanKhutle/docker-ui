"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sshService = exports.SSHService = void 0;
const node_ssh_1 = require("node-ssh");
class SSHService {
    async getConnection(config) {
        const ssh = new node_ssh_1.NodeSSH();
        await ssh.connect({
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            privateKey: config.privateKey,
            readyTimeout: 10000,
        });
        return ssh;
    }
    async testConnection(config) {
        let ssh = null;
        try {
            ssh = await this.getConnection(config);
            const result = await ssh.execCommand('echo "UITP_TEST_OK"');
            return result.stdout.includes('UITP_TEST_OK');
        }
        catch {
            return false;
        }
        finally {
            if (ssh)
                ssh.dispose();
        }
    }
    async listImages(config, nodeType) {
        let ssh = null;
        try {
            ssh = await this.getConnection(config);
            if (nodeType === 'docker') {
                return await this.listDockerImages(ssh);
            }
            else if (nodeType === 'containerd') {
                return await this.listContainerdImages(ssh);
            }
            return [];
        }
        finally {
            if (ssh)
                ssh.dispose();
        }
    }
    async listDockerImages(ssh) {
        const result = await ssh.execCommand(`docker images --format '{{.Repository}}\\t{{.Tag}}\\t{{.Digest}}\\t{{.Size}}\\t{{.CreatedAt}}\\t{{.ID}}' 2>/dev/null`);
        if (result.code !== 0 || !result.stdout)
            return [];
        return result.stdout
            .split('\n')
            .filter(Boolean)
            .map((line) => {
            const [repository, tag, digest, size, createdAt, imageId] = line.split('\t');
            return {
                repository: repository || '<none>',
                tag: tag || '<none>',
                digest: digest !== '<none>' ? digest : undefined,
                size_bytes: this.parseDockerSize(size),
                created_date: createdAt,
                image_id_on_node: imageId,
            };
        })
            .filter((img) => img.repository !== '<none>' && img.tag !== '<none>');
    }
    async listContainerdImages(ssh) {
        const result = await ssh.execCommand(`ctr -n k8s.io images ls 2>/dev/null | tail -n +2`);
        if (result.code !== 0 || !result.stdout)
            return [];
        return result.stdout
            .split('\n')
            .filter(Boolean)
            .map((line) => {
            const parts = line.trim().split(/\s+/);
            const fullName = parts[0] || '';
            const [repository, tag] = fullName.includes(':')
                ? fullName.split(':')
                : [fullName, 'latest'];
            return {
                repository,
                tag,
                digest: parts[1],
                size_bytes: this.parseContainerdSize(parts[3]),
                created_date: parts[4],
            };
        })
            .filter((img) => img.repository && img.tag);
    }
    async transferImage(sourceConfig, sourceNodeType, destConfig, destNodeType, imageName, onLog) {
        let sourceSsh = null;
        let destSsh = null;
        try {
            onLog(`Connecting to source node ${sourceConfig.host}...`);
            sourceSsh = await this.getConnection(sourceConfig);
            onLog(`Connected to source node.`);
            onLog(`Connecting to destination node ${destConfig.host}...`);
            destSsh = await this.getConnection(destConfig);
            onLog(`Connected to destination node.`);
            // Generate temp file path
            const tmpFile = `/tmp/uitp_transfer_${Date.now()}.tar`;
            const safeImageName = imageName.replace(/[:/]/g, '_');
            const sourceTmpFile = `/tmp/uitp_src_${safeImageName}_${Date.now()}.tar`;
            const destTmpFile = `/tmp/uitp_dst_${safeImageName}_${Date.now()}.tar`;
            // Save image on source
            onLog(`Saving image ${imageName} on source node...`);
            const saveCmd = sourceNodeType === 'docker'
                ? `docker save ${imageName} -o ${sourceTmpFile}`
                : `ctr -n k8s.io images export ${sourceTmpFile} ${imageName}`;
            const saveResult = await sourceSsh.execCommand(saveCmd);
            if (saveResult.code !== 0) {
                throw new Error(`Failed to save image: ${saveResult.stderr}`);
            }
            onLog(`Image saved to ${sourceTmpFile}`);
            // Get file size
            const statResult = await sourceSsh.execCommand(`stat -c%s ${sourceTmpFile}`);
            const fileSize = parseInt(statResult.stdout.trim()) || 0;
            onLog(`Image archive size: ${this.formatBytes(fileSize)}`);
            // Download from source
            onLog(`Downloading image archive from source...`);
            await sourceSsh.getFile(tmpFile, sourceTmpFile);
            onLog(`Downloaded successfully.`);
            // Upload to destination
            onLog(`Uploading image archive to destination...`);
            await destSsh.putFile(tmpFile, destTmpFile);
            onLog(`Uploaded successfully.`);
            // Load image on destination
            onLog(`Loading image on destination node...`);
            const loadCmd = destNodeType === 'docker'
                ? `docker load -i ${destTmpFile}`
                : `ctr -n k8s.io images import ${destTmpFile}`;
            const loadResult = await destSsh.execCommand(loadCmd);
            if (loadResult.code !== 0) {
                throw new Error(`Failed to load image: ${loadResult.stderr}`);
            }
            onLog(`Image loaded: ${loadResult.stdout.trim()}`);
            // Cleanup
            onLog(`Cleaning up temporary files...`);
            await sourceSsh.execCommand(`rm -f ${sourceTmpFile}`);
            await destSsh.execCommand(`rm -f ${destTmpFile}`);
            const { unlink } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await unlink(tmpFile).catch(() => { });
            onLog(`Transfer completed successfully!`);
        }
        finally {
            if (sourceSsh)
                sourceSsh.dispose();
            if (destSsh)
                destSsh.dispose();
        }
    }
    parseDockerSize(size) {
        if (!size)
            return 0;
        const units = {
            B: 1,
            KB: 1024,
            MB: 1024 * 1024,
            GB: 1024 * 1024 * 1024,
        };
        const match = size.match(/^([\d.]+)\s*([A-Z]+)$/i);
        if (!match)
            return 0;
        const [, val, unit] = match;
        return Math.round(parseFloat(val) * (units[unit.toUpperCase()] || 1));
    }
    parseContainerdSize(size) {
        if (!size)
            return 0;
        return this.parseDockerSize(size);
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
exports.SSHService = SSHService;
exports.sshService = new SSHService();
//# sourceMappingURL=sshService.js.map