import { issueVerificationCode, sendEmail } from "../utils/etc/emailHelper";
import EmailModel from "./email.model";
import { EmailRepositoryWrite } from "./email.repository";
import EmailValidated from "./email.validated";

export default class EmailWrite implements EmailRepositoryWrite {
    constructor(
        private emailModel = new EmailModel(),
        private emailValidate = new EmailValidated(),
    ) {}

    /** Generates a verification code, stores the hash, and sends the raw code via email */
    create = async (user_id: string, email: string) => {
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
    };
}