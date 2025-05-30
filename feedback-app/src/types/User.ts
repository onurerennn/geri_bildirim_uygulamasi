import { UserRole } from './UserRole';

export interface User {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    business?: string | null;
    points?: number;
    createdAt: Date;
    updatedAt: Date;
    needsBusinessConfig?: boolean;
} 