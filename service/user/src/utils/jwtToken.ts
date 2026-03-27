import { sign, verify} from "hono/jwt";
import { secret_key } from "../config";
import { userToken } from "../userTypes";

export const signedJwt = async (req : userToken) => {
    try {
    return await sign(req, secret_key, "HS256"); 
    } catch (error) {
        
    }
}

export const verifyJwt = async (token?: string) => {
    try {
        if (!token) throw {
            status: 401,
            message: "unauthorized please login first"
        };
    return await verify(token, secret_key, "HS256");
    } catch (error) {
        throw {
            status: 401,
            message: "token expired , please login"
        }
    }
}