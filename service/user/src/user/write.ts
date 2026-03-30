import { ZodError } from "zod";
import { userRegisterValue } from "../userTypes";
import { UserValidate } from "./validate";
import UserModel from "./model";
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
    uploadPhotoProfile = async () => {};
    deletePhotoProfile = async () => {};
}
