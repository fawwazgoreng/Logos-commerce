
export abstract class BaseRepositoryModel<T , R = T[]> {
    abstract create(data: any): Promise<T>
    abstract findById(id: string): Promise<T | null>
    abstract show(data: any): Promise<R>
    abstract update(id: string, data: any): Promise<T>
    abstract delete(id: string): void
}

export abstract class BaseRepositoryRead<T> {
    abstract findById(id: string): Promise<T | null>
    abstract show(data: any): Promise<T[]>   
}

export abstract class BaseRepositoryWrite<T> {
    abstract create(data: any): Promise<T>
    abstract update(id: string, data: any): Promise<T>
    abstract delete(id: string): void
}
export abstract class ImageRepository {
    abstract save(image: File): Promise<string>
    abstract edit(oldUrl: string, newImage?: File): Promise<string>
    abstract delete(url: string): void
}