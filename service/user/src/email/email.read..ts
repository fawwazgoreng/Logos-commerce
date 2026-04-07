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
            throw { status: 400, message: "Verification code has expired" };
        }

        /** Compare the raw input with the stored argon2/bcrypt hash */
        const isValid = await Bun.password.verify(
            validated.input_code,
            record.code,
        );
        if (!isValid) {
            throw { status: 400, message: "Verification code is incorrect" };
        }

        /** Delete the code after successful use to prevent reuse */
        await this.emailModel.delete(record.id);

        return record.user.id;
    };
}
