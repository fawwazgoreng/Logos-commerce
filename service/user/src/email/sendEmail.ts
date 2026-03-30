import * as nodemailer from "nodemailer";
import { env } from "../config";

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

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
    return { success: true, message: "Server is ready to take our messages" };
  } catch (error: any) {
    throw handleSmtpError(error);
  }
};