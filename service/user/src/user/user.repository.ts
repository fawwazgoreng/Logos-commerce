import {
    BaseRepositoryModel,
    BaseRepositoryRead,
} from "../type/baseRepository";
import { user, userShowRequest, userWithPassword } from "../type/userTypes";

export abstract class UserRepositoryModel extends BaseRepositoryModel<
    user,
    user[] | null
> {
    abstract create(data: any): Promise<user>;
    abstract update(id: string, data: any): Promise<user>;
    abstract findById(id: string): Promise<userWithPassword | null>;
    abstract findByEmail(email: string): Promise<userWithPassword | null>;
    abstract delete(id: string): void;
    abstract updateProfileImage(data: any): Promise<{ image: string }>;
    abstract getProfileImage(
        id: string,
    ): Promise<{ image: string | null } | null>;
    abstract clearProfileImage(
        id: string,
    ): Promise<{ image: string | null } | null>;
    abstract getId(id: string): Promise<{ id: string } | null>;
    abstract show(data: userShowRequest): Promise<user[] | null>;
    abstract verify(
        id: string,
    ): Promise<{ is_verify: boolean; verify_at: Date | null } | null>;
}

export abstract class UserRepositoryRead {
    abstract login(data: any): Promise<{ user: user | null; token: string }>;
    abstract refresh(token?: string): Promise<user | null>;
}
export abstract class UserRepositoryWrite {
    abstract register(data: any): Promise<user>;
    abstract verify(id: string): Promise<{
        is_verify: boolean;
        verify_at: Date | null;  
    }>;
    abstract uploadPhotoProfile(data: any): Promise<{ image: string }>;
    abstract editPhotoProfile(data: any): Promise<{ image: string }>;
    abstract deletePhotoProfile(id: string): Promise<void>;
}
