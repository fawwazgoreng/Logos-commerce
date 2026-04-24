export abstract class BaseRepositoryModel<T , R = T[]> {
    abstract create(data: any): Promise<T>
    abstract show(data: any): Promise<R>
    abstract update(id: string | number, data: any): Promise<T>
    abstract delete(id: string | number): void
    abstract findById(id: string | number): Promise<T>
}

export abstract class BaseRepositoryRead<T , R = T[]> {
    abstract show(data: any): Promise<R>
    abstract findById(id: string | number): Promise<T>
}

export abstract class BaseRepositoryWrite<T> {
    abstract create(data: any): Promise<T>
    abstract update(data: any): Promise<T>
    abstract delete(id: string): void
}