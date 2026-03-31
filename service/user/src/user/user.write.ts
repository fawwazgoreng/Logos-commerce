import { ZodError } from "zod";
import { createPhotoProfile, userRegisterValue } from "../type/userTypes";
import { UserValidate } from "./user.validate";
import UserModel from "./user.model";
import { hashingPassword } from "../utils/hashPasword";

export default class UserWrite {
    constructor(
        private userValidate = new UserValidate(),
        private userModel = new UserModel(),
    ) {}
    register = async (req: userRegisterValue) => {
        try {
            const validated = this.userValidate.register(req);
            const hashedPassword = await hashingPassword(validated.password);
            const payload: userRegisterValue = {
                ...validated,
                password: hashedPassword,
            };
            const user = await this.userModel.register(payload);
            return user;
        } catch (error: any) {
            if (error instanceof ZodError) {
                throw {
                    status: 422,
                    message: error.issues[0].message,
                    error: error.cause,
                };
            }
            throw {
                status: error.status || 500,
                message: error.message || "internal server error",
                error: error.error || "internal server error",
            };
        }
    };
    verify = async (id: string) => {
        try {
            await this.userModel.verified(id);
        } catch (error: any) {
            throw {
                status: error.status || 500,
                message: error.message || "internal server error",
                error: error.error || "internal server error",
            };
        }
    };
    uploadPhotoProfile = async (req: createPhotoProfile) => {
        try {
            const validated = this.userValidate.uploadImage(req);
            const imageUrl = ;
        } catch (error : any) {
            if (error instanceof ZodError) {
                throw {
                    status: 422,
                    message: error.issues[0].message,
                    error: error.cause,
                };
            }
            throw {
                status: error.status || 500,
                message: error.message || "internal server error",
                error: error.error || "internal server error",
            };
        }
    };
    deletePhotoProfile = async () => {};
}
