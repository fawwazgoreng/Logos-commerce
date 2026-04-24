import { BaseRepositoryModel, BaseRepositoryRead, BaseRepositoryWrite } from "../types/baseRepository";
import { product } from "../types/product.type";

export abstract class ProductRepositoryModel implements BaseRepositoryModel<product> {
    abstract delete(id: string | number): void;
    abstract create(data: any): Promise<product>;
    abstract update(id: string | number, data: any): Promise<product>;
    abstract show(data: any): Promise<product[]>;
    abstract findById(id: string | number): Promise<product>;
}

export abstract class ProductRepositoryRead implements BaseRepositoryRead<product> {
    abstract show(data: any): Promise<product[]>;
    abstract findById(id: string | number): Promise<product>;
}

export abstract class ProductRepositoryWrite implements BaseRepositoryWrite<product> {
    abstract update(data: any): Promise<product>;
    abstract create(data: any): Promise<product>;
    abstract delete(id: string): void;
}