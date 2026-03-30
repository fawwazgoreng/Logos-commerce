import { PrismaClientKnownRequestError } from "../infrastructure/database/generated/prisma/runtime/client";
import prisma from "../infrastructure/database/prisma";

 // Generates a random 6-digit numeric code, hashes it, and saves it to the database.
export const issueVerificationCode = async (userId: string) => {
    try {
        // Generate a random 6-digit string
        const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set expiration time (Current time + 5 minutes)
        const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

        // Hash the code using Bun's native Bcrypt implementation
        const hashedCode = await Bun.password.hash(rawCode, {
            algorithm: "bcrypt",
            cost: 10,
        });

        // Store the verification attempt in the database
        await prisma.code_verification.create({
            data: {
                user_id: userId,
                code: hashedCode,
                status: "sending",
                expired: expiresAt,
            },
        });

        return rawCode;
    } catch (error) {
        throw {
            status: 500,
            message: "Failed to generate verification code",
            error
        };
    }
};

 // Validates the provided code against the latest stored hash for the user.
export const validateVerificationCode = async (inputCode: string, userId: string) => {
    try {
        // Retrieve the most recent code for this user
        const record = await prisma.code_verification.findFirst({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                code: true,
                expired: true,
            } 
        });

        if (!record) {
            throw { status: 404, message: "No verification code found for this user" };
        }

        // Check if the current time has passed the expiration time
        const isExpired = new Date() > record.expired;
        if (isExpired) {
            throw { status: 400, message: "Verification code has expired" };
        }

        // Compare the raw input with the stored hash
        const isValid = await Bun.password.verify(inputCode, record.code);

        if (isValid) {
            // Delete the code after successful use so it cannot be used again
            await prisma.code_verification.delete({ where: { id: record.id } });
        }

        return isValid;

    } catch (error: any) {
        // Handle specific Prisma errors
        if (error instanceof PrismaClientKnownRequestError) {
            throw {
                status: 400,
                message: "Database operation failed",
                detail: error.message
            };
        }

        // General server error
        throw {
            status: 500,
            message: "Internal server error during verification"
        };
    }
};