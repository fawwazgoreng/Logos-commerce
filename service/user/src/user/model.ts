import { PrismaClientKnownRequestError } from "../infrastructure/database/generated/prisma/runtime/client"
import { userLogin, userRegisterValue } from "../userTypes"
import { checkPassword } from "../utils/hashPasword";

export default class UserModel {
    login = async (req : userLogin) => {
        try {
            const user = await prisma?.user.findFirst({
                where: {
                    email: req.email
                },
                select: {
                    id: true,
                    roles: true,
                    email: true,
                    username: true,
                    password: true
                }
            });
            if (!user || !checkPassword({password: req.password, hashed: user.password})) throw {
                status: 404,
                message: "username or password wrong"
            }
            return user;
        } catch (error : any) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == "P2025") {
                    throw {
                        status: 404,
                        message: "username or password wrong"
                    }
                }
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
    }
    register = async (req : userRegisterValue) => {
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
                select: {
                    id: true,
                    username: true,
                    email: true,
                    roles: true
                }
            });
            if (!user?.id) {
                throw {
                    status: 400,
                    message: "failed create user"
                }
            }
            return user;
        } catch (error : any) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == "P2002") {
                    throw {
                        status: 401,
                        message: "email has used"
                    }
                }
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
    }
    refresh = async (user_id : string) => {
        try {
            const user = await prisma?.user.findFirst({
                where: {
                    id: user_id
                },
                select: {
                    id: true,
                    roles: true,
                    email: true,
                    username: true,
                    password: true
                }
            });
            if (!user?.id) {
                throw {
                    status: 404,
                    message: "user data not found"
                }
            }
            return user;
        } catch (error : any) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == "P2025") {
                    throw {
                        status: 404,
                        message: "username or password wrong"
                    }
                }
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
    }
}