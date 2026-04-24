import ProductModel from "../product/product.model";

export interface ProductAuditLog {
    id: string;
    productId: string;
    product: ProductModel;

    action: string;
    oldValue: JSON;
    newValue: JSON;
    changedBy: string;

    createdAt: Date;
}
