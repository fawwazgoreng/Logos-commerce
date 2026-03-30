import { ZodError } from "zod";
import { issueVerificationCode, sendEmail } from "../utils/emailHelper";
import EmailModel from "./email.model";
import EmailValidated from "./email.validated";

export default class EmailWrite {
    constructor(
        private emailModel = new EmailModel(),
        private emailValidate = new EmailValidated(),
    ) {}

    /** Generates a verification code, stores the hash, and sends the raw code via email */
    create = async (user_id: string, email: string) => {
        try {
            const { rawCode, hashedCode } = await issueVerificationCode(user_id);

            /** Prepare verification payload with a 5-minute expiration window */
            const payload = {
                user_id,
                code: rawCode,
                hashedCode,
                status: "pending",
                expired: new Date(Date.now() + 1000 * 60 * 5),
            };

            /** Validate payload via Zod and persist to database */
            const validated = this.emailValidate.create(payload);
            await this.emailModel.create({
                user_id,
                status: validated.status,
                expired: validated.expired,
                code: validated.hashedCode,
            });

            /** Send the raw (unhashed) code to the user's email address */
            await sendEmail(email, rawCode);

            return { status: 201, message: "Verification code sent successfully" };
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
            message: error.message || "Failed to generate verification code",
            error: error.error || null,
        };
    }
}