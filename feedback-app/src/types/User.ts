import { UserRole } from './UserRole';

export interface User {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    business?: string;
    createdAt: Date;
    updatedAt: Date;
} 