import z from "zod"
import { createPhotoProfile, userLogin, userRegisterValue } from "../type/userTypes";

const loginValidate = z.object({
    email: z.email().min(6).max(150).lowercase(),
    password: z.string().min(6).max(100)
        .regex(/[A-Z][a-z]/ , {error: "password must contain one uppercase and lowercase"})
        .regex(/[0-9`~<>?,./!@#$%^&*()_|+\-=\\{}\\[\\];:\\'"]/ , {error: "password must contain unique character"})
})

const registerValidate = z.object({
    email: z.email().min(6).max(150).lowercase(),
    username: z.string().min(6).max(100),
    role: z.enum(['user' , 'seller']),
    password: z.string().min(6).max(100)
        .regex(/[A-Z][a-z]/ , {error: "password must contain one uppercase and lowercase"})
        .regex(/[0-9`~<>?,./!@#$%^&*()_|+\-=\\{}\\[\\];:\\'"]/ , {error: "password must contain unique character"})
})

const createImage = z.object({
    user_id: z.string().min(36),
    image: z.file().mime(["image/png","image/jpeg","image/webp"]).max(200000)
})

export class UserValidate {
    login = (req : userLogin) => {
        return loginValidate.parse(req);
    }
    register = (req : userRegisterValue) => {
        return registerValidate.parse(req);
    }
    uploadImage = (req: createPhotoProfile) => {
        return createImage.parse(req);
    }
}