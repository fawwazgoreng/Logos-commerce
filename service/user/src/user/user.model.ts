import { PrismaClientKnownRequestError } from "../infrastructure/database/generated/prisma/runtime/client"
import { userLogin, userRegisterValue } from "../type/userTypes"
import { checkPassword } from "../utils/hashPasword";

export default class UserModel {
    // Validate credentials and return user data
    login = async (req: userLogin) => {
        try {
            const user = await prisma?.user.findFirst({
                where: { email: req.email },
                select: {
                    id: true,
                    roles: true,
                    email: true,
                    username: true,
                    password: true
                }
            });

            // Verify existence and password match
            if (!user || !checkPassword({ password: req.password, hashed: user.password })) {
                throw { status: 404, message: "username or password wrong" };
            }

            return user;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Create a new user record in database
    register = async (req: userRegisterValue) => {
        try {
            const user = await prisma?.user.create({
                data: {
                    email: req.email,
                    username: req.username,
                    password: req.password,
                    image: "",
                    roles: req.role,
                    is_verify: false
                },
                select: { id: true, username: true, email: true, roles: true }
            });

            if (!user?.id) throw { status: 400, message: "failed create user" };
            return user;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Get fresh user data by ID
    refresh = async (user_id: string) => {
        try {
            const user = await prisma?.user.findFirst({
                where: { id: user_id },
                select: {
                    id: true,
                    roles: true,
                    email: true,
                    username: true,
                    password: true
                }
            });

            if (!user?.id) throw { status: 404, message: "user data not found" };
            return user;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Mark user email as verified
    verified = async (id: string) => {
        try {
            const user = await prisma?.user.update({
                where: { id },
                data: {
                    is_verify: true,
                    verify_at: new Date()
                }
            });

            if (!user) throw { status: 404, message: "failed verify email" };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Update user profile image path
    editProfile = async (req: { image: string, id: string, path?: string }) => {
        try {
            const result = await prisma?.user.update({
                where: {
                    id: req.id,
                    image: { startsWith: req.path || "" }
                },
                data: { image: req.image },
                select: { image: true }
            });

            if (!result) throw { status: 404, message: "id user wrong" };
            return result.image;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Retrieve current profile image URL
    getProfile = async (id: string) => {
        try {
            const user = await prisma?.user.findFirst({
                where: { id },
                select: { image: true }
            });

            if (!user?.image) throw { status: 404, message: "id user wrong" };
            return user.image;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Clear profile image path from database and return old URL
    deleteProfile = async (id: string) => {
        try {
            const user = await prisma?.user.findFirst({
                where: { id },
                select: { image: true }
            });

            if (!user?.image) throw { status: 404, message: "id user wrong" };

            await prisma?.user.update({
                data: { image: "" },
                where: { id }
            });

            return user.image;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Centralized Prisma and Generic error handler
    private handleError(error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            // P2002: Unique constraint failed
            if (error.code === "P2002") {
                return { status: 401, message: "email has used" };
            }
            // P2025: Record not found
            if (error.code === "P2025") {
                return { status: 404, message: "record not found or unauthorized" };
            }
            return {
                status: 400,
                message: error.message,
                error: `${error.code} ${error.cause || ""}`
            };
        }
        
        // Return existing custom error or default to 500
        return {
            status: error.status || 500,
            message: error.message || "internal server error",
            error: error.error || "internal server error"
        };
    }
}