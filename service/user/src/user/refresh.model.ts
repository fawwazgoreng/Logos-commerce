import { refreshTokenCreate } from "../type/userTypes";

export default class RefreshTokenModel {
    create = async (req: refreshTokenCreate) => {
        return await prisma?.refresh_token.create({
            data: req,
            select: {
                id: true,
            },
        });
    };
    find = async (id: string, user_id: string) => {
        return await prisma?.refresh_token.findFirst({
            where: {
                id,
                user_id,
            },
        });
    };
}
