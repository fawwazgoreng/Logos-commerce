import { ProductAuditLog } from "./audit";
import { Category } from "./category";

export interface products {
    id: string;
    storeId: string;
    categoryId: string;
    category: Category;

    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;

    mainImage: string;
    images: JSON;

    isActive: boolean;
    version: number;

    auditLogs: ProductAuditLog;

    createdAt: Date;
    updatedAt: Date;
}
