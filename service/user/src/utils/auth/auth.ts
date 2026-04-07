import { sign, verify } from "hono/jwt";
import { userToken } from "../../type/userTypes";
import { env } from "../../config";

/** Token Life Cycles */
const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 15;

export const verifyJwt = async (token: string) => {
    return await verify(token, env.SECRET_KEY, "HS256");
};

/** Creates a signed Access Token (JWT) with user payload */
export const buildAccessToken = async (user: any) => {
    const payload: userToken = {
        ...user,
        expired: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
    };
    return await sign(payload, env.SECRET_KEY, "HS256");
};