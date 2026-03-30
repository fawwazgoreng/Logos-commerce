import z from "zod";
import { createEmailTypeWithHashed } from "../type/emailType";

const createEmail = z.object({
    user_id: z.string(),
    code: z.string().min(6).max(6),
    hashedCode: z.string(),
    expired: z.date(),
    status: z.enum(['pending' , 'verified' , 'failed'])
});

const verifyEmail = z.object({
    input_code: z.string().min(6).max(6),
    user_id: z.string() 
});

export default class EmailValidated {
    create = (req: createEmailTypeWithHashed) => {
        return  createEmail.parse(req);
    }
    verify = (req: {input_code : string,user_id : string}) => {
        return  verifyEmail.parse(req);
    }
}
