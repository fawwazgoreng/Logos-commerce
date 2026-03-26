import z from "zod"
import { userLogin, userRegister } from "../userTypes";

const loginValidate = z.object({
    email: z.email().min(6).max(150).lowercase(),
    password: z.string().min(6).max(100)
        .regex(/[A-Z][a-z]/ , {error: "password must contain one uppercase and lowercase"})
        .regex(/[0-9`~<>?,./!@#$%^&*()_|+\-=\\{}\\[\\];:\\'"]/ , {error: "password must contain unique character"})
})

const registerValidate = z.object({
    email: z.email().min(6).max(150).lowercase(),
    username: z.string().min(6).max(100),
    image: z.file().mime(["image/jpeg", "image/png", "image/webp"]).max(200000),
    role: z.enum(['user' , 'seller' , 'admin']),
    password: z.string().min(6).max(100)
        .regex(/[A-Z][a-z]/ , {error: "password must contain one uppercase and lowercase"})
        .regex(/[0-9`~<>?,./!@#$%^&*()_|+\-=\\{}\\[\\];:\\'"]/ , {error: "password must contain unique character"})
})

export class UserValidate {
    login = (req : userLogin) => {
        return loginValidate.parse(req);
    }
    register = (req : userRegister) => {
        return registerValidate.parse(req);
    }
}