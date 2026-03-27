import { ZodError } from "zod";
import { monitoring, refresh_token_create, userLogin, userToken } from "../userTypes"
import { UserValidate } from "./validate"
import UserModel from "./model";
import { encrypToken } from "../utils/encrypToken";
import RefreshTokenModel from "./refresh.model";

export default class UserRead {
    constructor(private validate =  new UserValidate(), private userModel = new UserModel() , private refreshTokenModel = new RefreshTokenModel()) {}
    login = async (req: userLogin) => {
        try {
            const payload = this.validate.login(req);
            const user = await this.userModel.login(payload);
            const now = new Date();
            const expired = new Date(Date.now() + Date.now() + 1000 * 60 * 60 * 24 * 7);
            const res = {
                id: user.id,
                username: user.username,
                role: user.roles as "seller" || "user",
                email: user.email,
                created_at: now,
            }
            const refreshTokenPayload: refresh_token_create = {
                user_id: user.id,
                expired,
                created_at: now
                
            }
            const refresh_token = await this.refreshTokenModel.create(refreshTokenPayload);
            const refresh_token_raw = {
                id: refresh_token?.id,
                role: user.roles as "seller" || "user",
                created_at: now,
                expired
            }
            const token = await encrypToken(JSON.stringify(refresh_token_raw));
            return {
                user: res,
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