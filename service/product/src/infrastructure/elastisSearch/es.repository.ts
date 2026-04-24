import { EsSearchProduct } from "../../types/es.type";

export abstract class EsRepositoryModel {
    abstract index(data: any): Promise<any>;
    abstract update(id: string | number, data: any): Promise<any>;
    abstract delete(id: string | number): void;
    abstract search(): Promise<any>
}

export abstract class EsRepositoryCase {
    abstract index(data: any): Promise<any>;
    abstract update(id: string | number, data: any): Promise<any>;
    abstract delete(id: string | number): void;
    abstract search(req: EsSearchProduct): Promise<any>
    abstract buildQuery(data: any): Promise<any>
}