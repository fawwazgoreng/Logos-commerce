import { emailType, emailTypeWithUser } from "../type/emailType";

export abstract class EmailRepositoryModel {
    abstract create(data: any): Promise<emailType>
    abstract verify(code: string): Promise<emailTypeWithUser | null>
    abstract delete(id: string): void    
}

export abstract class EmailRepositoryRead {
    abstract verify(data: any): Promise<string | null>
}

export abstract class EmailRepositoryWrite {
    abstract create(user_id: string , email: string): Promise<void>
}