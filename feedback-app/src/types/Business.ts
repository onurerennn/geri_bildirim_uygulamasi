export interface Business {
    _id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    logo?: string;
    isApproved: boolean;
    isActive: boolean;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
} 