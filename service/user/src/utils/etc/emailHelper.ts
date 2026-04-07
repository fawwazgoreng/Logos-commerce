import transport from "../../config/email";
import { env } from "../../config";

const handleSmtpError = (error: any) => {
    let message = "Send failed:";

    switch (error.code) {
        case "ECONNECTION":
        case "ETIMEDOUT":
            message = `Network error - retry later: ${error.message}`;
            break;
        case "EAUTH":
            message = `Authentication failed: ${error.message}`;
            break;
        case "EENVELOPE":
            message = `Invalid recipients: ${error.rejected}`;
            break;
        default:
            message = `Send failed: ${error.message}`;
    }

    return {
        status: 400,
        message,
        error,
    };
};

// Generates a random 6-digit numeric code, hashes it, and saves it to the database.
export const issueVerificationCode = async (userId: string) => {
    try {
        // Generate a random 6-digit string
        const rawCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash the code using Bun's native Bcrypt implementation
        const hashedCode = await Bun.password.hash(rawCode, {
            algorithm: "bcrypt",
            cost: 10,
        });

        return { rawCode, hashedCode };
    } catch (error) {
        throw {
            status: 500,
            message: "Failed to generate verification code",
            error,
        };
    }
};

export const sendEmail = async (email: string, code: string) => {
    try {
        const info = await transport.sendMail({
            from: `"Support System" <${env.SMTP_USER}>`,
            to: email,
            subject: "Verification Code",
            text: `Your verification code is: ${code}`,
            html: `<b>Your verification code is: <span style="color: blue;">${code}</span></b>`,
        });

        return info;
    } catch (error: any) {
        throw handleSmtpError(error);
    }
};

export const checkSmtp = async () => {
    try {
        await transport.verify();
        return {
            success: true,
            message: "Server is ready to take our messages",
        };
    } catch (error: any) {
        throw handleSmtpError(error);
    }
};
