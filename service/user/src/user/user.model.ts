import prisma from "../infrastructure/database/prisma";
import { user, userRegisterValue, userWithPassword } from "../type/userTypes";
import { UserRepositoryModel } from "./user.repository";

export default class UserModel implements UserRepositoryModel {
    show = async (req: {
        where: any;
        take: number;
        skip: number;
        orderBy: any;
    }) => {
        return (await prisma.user.findMany({
            take: req.take,
            skip: req.skip,
            where: req.where,
            orderBy: req.orderBy,
            select: {
                id: true,
                roles: true,
                email: true,
                username: true,
                is_verify: true,
            },
        })) as user[] | null;
    };

    //  Find user by email (for login)
    findByEmail = async (email: string) => {
        return (await prisma.user.findFirst({
            where: { email },
            select: {
                id: true,
                roles: true,
                email: true,
                username: true,
                is_verify: true,
                password: true,
            },
        })) as userWithPassword | null;
    };

    //  Create user
    create = async (req: userRegisterValue) => {
        return (await prisma.user.create({
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
                roles: true,
                email: true,
                username: true,
                is_verify: true,
            },
        })) as user;
    };

    //  Find user by ID
    findById = async (id: string) => {
        return (await prisma.user.findFirst({
            where: { id },
            select: {
                id: true,
                roles: true,
                email: true,
                username: true,
                password: true,
            },
        })) as userWithPassword | null;
    };

    //  Verify email
    verify = async (id: string) => {
        return await prisma.user.update({
            where: { id },
            data: {
                is_verify: true,
                verify_at: new Date(),
            },
        }) as {
            is_verify: boolean;
            verify_at: Date | null;
        };
    };

    update = async (id: string, data: any) => {
        return (await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                roles: true,
                email: true,
                username: true,
                is_verify: true,
            },
        })) as user;
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

    delete = async (id: string) => {
        await prisma.user.delete({
            where: { id },
        });
    };
}
