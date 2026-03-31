import { PrismaClientKnownRequestError } from "../infrastructure/database/generated/prisma/runtime/client";
import { createEmailType } from "../type/emailType";
import prisma from "../infrastructure/database/prisma";

export default class EmailModel {
    /** Store a new verification code attempt in the database */
    create = async (req: createEmailType) => {
        try {
            return await prisma.code_verification.create({ data: req });
        } catch (error: any) {
            this.handlePrismaError(error);
        }
    };

    /** Retrieve the most recent active code for a specific user */
    verify = async (user_id: string) => {
        try {
            const record = await prisma.code_verification.findFirst({
                where: { user_id },
                orderBy: { created_at: "desc" },
                select: {
                    id: true, code: true, expired: true, user: {
                        select: {
                            id: true
                        }
                } },
            });
            return record;
        } catch (error: any) {
            this.handlePrismaError(error);
        }
    };

    /** Remove a verification record after successful use or expiration */
    delete = async (id: string) => {
        try {
            await prisma.code_verification.delete({ where: { id } });
        } catch (error: any) {
            this.handlePrismaError(
                error,
                "Record not found or already deleted",
            );
        }
    };

    /** Centralized helper to map Prisma errors to HTTP exceptions */
    private handlePrismaError(
        error: any,
        notFoundMsg: string = "Record not found",
    ) {
        if (error instanceof PrismaClientKnownRequestError) {
            const isNotFound = error.code === "P2025";
            throw {
                status: isNotFound ? 404 : 400,
                message: isNotFound ? notFoundMsg : error.message,
                error: `${error.code} ${error.cause ?? ""}`,
            };
        }
        throw error.status
            ? error
            : { status: 500, message: "Internal server error" };
    }
}
