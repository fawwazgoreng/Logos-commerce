import { ZodError } from "zod";
import { monitoring, userLogin, userToken } from "../userTypes"
import { UserValidate } from "./validate"
import UserModel from "./model";
import { encrypToken } from "../utils/encrypToken";

export default class UserRead {
    constructor(private validate =  new UserValidate(), private userModel = new UserModel()) {}
    login = async (req: userLogin) => {
        try {
            const payload = this.validate.login(req);
            const user = await this.userModel.login(payload);
            const res : userToken = {
                id: user.id,
                username: user.username,
                role: user.roles as "seller" || "user",
                email: user.email
            }
            const token = await encrypToken(JSON.stringify(res));
            return {
                res,
                token
            };
        } catch (error : any) {
            if (error instanceof ZodError) {
                throw {
                    status: 422,
                    message: error.issues[0].message,
                    error: error.cause || error.issues
                }
            }
            throw {
                status: error.status || 500,
                message: error.message || "internal server error",
                error: error.error || "internal server error"
            }
        }
    }
    profile = async () => {
        try {
            
        } catch (error) {
            
        }
    }
}