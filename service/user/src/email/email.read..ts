import { AppError } from "../utils/error";
import EmailModel from "./email.model";
import EmailValidated from "./email.validated";

export default class EmailRead {
    constructor(
        private emailModel = new EmailModel(),
        private emailValidated = new EmailValidated(),
    ) {}

    /** Validates the provided code against the latest stored hash for the user */
    verify = async (req: { input_code: string; user_id: string }) => {
        const validated = this.emailValidated.verify({ ...req });
        const record = await this.emailModel.verify(validated.user_id);

        /** Check if the verification code has already expired */
        if (!record || !record.user.id || new Date() > record.expired) {
            throw new AppError(
                "Verification code has expired",
                400,
                "UNAUTHORIZE",
            );
        }

        /** Compare the raw input with the stored argon2/bcrypt hash */
        const isValid = await Bun.password.verify(
            validated.input_code,
            record.code,
        );
        if (!isValid) {
            throw new AppError(
                "Verification code is incorrect",
                400,
                "UNAUTHORIZE",
            );
        }

        /** Delete the code after successful use to prevent reuse */
        await this.emailModel.delete(record.id);

        return record.user.id;
    };
}
