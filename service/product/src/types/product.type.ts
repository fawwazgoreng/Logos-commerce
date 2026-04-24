import { ProductAuditLog } from "./audit.type";
import { Category } from "./category.type";

export type product = {
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
    updatedAt: Date;
}

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
