import { sign, verify} from "hono/jwt";
import { userToken } from "../type/userTypes";
import { env } from "../config";

export const signedJwt = async (req : userToken) => {
    try {
    return await sign(req, env.SECRET_KEY, "HS256"); 
    } catch (error) {
        
    }
}

export const verifyJwt = async (token?: string) => {
    try {
        if (!token) throw {
            status: 401,
            message: "unauthorized please login first"
        };
    return await verify(token, env.SECRET_KEY, "HS256");
    } catch (error) {
        throw {
            status: 401,
            message: "token expired , please login"
        }
    }
}
