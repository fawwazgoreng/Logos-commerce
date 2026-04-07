import ProductModel from "../product/product.model";

export interface Category {
    id: string;
    name: string;
    slug: string;
    products: ProductModel;
    createdAt: Date;
}
