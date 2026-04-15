import { createEmailType, emailTypeWithUser } from "../type/emailType";
import prisma from "../infrastructure/database/prisma";
import { EmailRepositoryModel } from "./email.repository";

export default class EmailModel implements EmailRepositoryModel {
    /** Store a new verification code attempt in the database */
    create = async (req: createEmailType) => {
        return await prisma.code_verification.create({ data: req });
    };

    /** Retrieve the most recent active code for a specific user */
    verify = async (user_id: string) => {
          return await prisma.code_verification.findFirst({
            where: { user_id },
            orderBy: { created_at: "desc" },
            select: {
                id: true,
                code: true,
                expired: true,
                user: { select: { id: true } },
            },
        }) as emailTypeWithUser | null;
    };

    /** Remove a verification record after successful use or expiration */
    delete = async (id: string) => {
        await prisma.code_verification.delete({ where: { id } });
    };
}
