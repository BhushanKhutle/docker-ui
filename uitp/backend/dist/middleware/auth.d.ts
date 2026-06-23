import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: UserRole;
    };
}
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function generateToken(user: {
    id: string;
    username: string;
    role: UserRole;
}): string;
//# sourceMappingURL=auth.d.ts.map