import prisma from "../infrastructure/database/prisma";
import { userRegisterValue } from "../type/userTypes";

export default class UserModel {
    //  Find user by email (for login)
    findByEmail = async (email: string) => {
        return prisma.user.findFirst({
            where: { email },
            select: {
                id: true,
                roles: true,
                email: true,
                username: true,
                password: true,
                is_verify: true
            },
        });
    };

    //  Create user
    create = async (req: userRegisterValue) => {
        return prisma.user.create({
            data: {
                email: req.email,
                username: req.username,
                password: req.password,
                image: "",
                roles: req.role,
                is_verify: false,
            },
            select: {
                id: true,
                username: true,
                email: true,
                roles: true,
            },
        });
    };

    //  Find user by ID
    findById = async (id: string) => {
        return prisma.user.findFirst({
            where: { id },
            select: {
                id: true,
                roles: true,
                email: true,
                username: true,
                password: true,
            },
        });
    };

    //  Verify email
    verify = async (id: string) => {
        return prisma.user.update({
            where: { id },
            data: {
                is_verify: true,
                verify_at: new Date(),
            },
        });
    };

    //  Update profile image
    updateProfileImage = async (req: {
        id: string;
        image: string;
        path?: string;
    }) => {
        return prisma.user.update({
            where: {
                id: req.id,
                image: { startsWith: req.path || "" },
            },
            data: { image: req.image },
            select: { image: true },
        });
    };

    // Get profile image
    getProfileImage = async (id: string) => {
        return prisma.user.findFirst({
            where: { id },
            select: { image: true },
        });
    };

    // Clear profile image
    clearProfileImage = async (id: string) => {
        return prisma.user.update({
            where: { id },
            data: { image: "" },
            select: { image: true },
        });
    };

    // Get id user to check existence
    getId = async (id: string) => {
        return prisma.user.findFirst({
            where: { id },
            select: {
                id: true,
            },
        });
    };
}
