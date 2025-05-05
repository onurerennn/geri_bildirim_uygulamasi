export interface Business {
    _id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    isActive: boolean;
    isApproved: boolean;
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
    ownerUserId?: string;
    logo?: string;
    description?: string;
    category?: string;
    website?: string;
}

export interface BusinessApprovalRequest {
    _id: string;
    businessId: string;
    requestedBy: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    businessData: Business;
}

export interface BusinessStats {
    totalSurveys: number;
    activeSurveys: number;
    totalResponses: number;
    responseRate: number;
    averageRating: number;
} 