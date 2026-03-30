import { PrismaClientKnownRequestError } from "../infrastructure/database/generated/prisma/runtime/client";
import { refreshTokenCreate } from "../type/userTypes";

export default class RefreshTokenModel {
    create = async (req: refreshTokenCreate) => {
        try {
            const refreshToken = await prisma?.refresh_token.create({
                data: req,
                select: {
                    id: true,
                },
            });
            if (!refreshToken?.id) {
                throw {
                    status: 400,
                    message: "failed creating refresh token"
                }
            }
            return refreshToken;
        } catch (error: any) {
            if (error instanceof PrismaClientKnownRequestError) {
                throw {
                    status: 400,
                    message: error.message,
                    error: error.code + ` ${error.cause}`
                }
            }
            throw {
                status: 500,
                message: "internal server error"
            }
        }
    };
}
