import { ZodError } from "zod";
import EmailModel from "./email.model";
import EmailValidated from "./email.validated";

export default class EmailRead {
    constructor(
        private emailModel = new EmailModel(),
        private emailValidated = new EmailValidated(),
    ) {}

    /** Validates the provided code against the latest stored hash for the user */
    verify = async (req: { input_code: string; user_id: string }) => {
        try {
            const validated = this.emailValidated.verify({ ...req });
            const record = await this.emailModel.verify(validated.user_id);
            
            /** Check if the verification code has already expired */
            if (!record || !record.user.id || new Date() > record.expired) {
                throw { status: 400, message: "Verification code has expired" };
            }

            /** Compare the raw input with the stored argon2/bcrypt hash */
            const isValid = await Bun.password.verify(validated.input_code, record.code);
            if (!isValid) {
                throw { status: 400, message: "Verification code is incorrect" };
            }

            /** Delete the code after successful use to prevent reuse */
            await this.emailModel.delete(record.id);

            return record.user.id;
        } catch (error: any) {
            this.handleError(error);
        }
    };

    /** Centralized error mapper for Zod and custom exceptions */
    private handleError(error: any) {
        if (error instanceof ZodError) {
            throw {
                status: 422,
                message: error.issues[0].message,
                error: error.format,
            };
        }
        throw {
            status: error.status || 500,
            message: error.message || "Failed to verify code",
            error: error.error || null,
        };
    }
}