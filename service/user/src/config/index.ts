import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SECRET_KEY: z.string().min(8, "Secret key to short!"),
DATABASE_URL: z.url("Format DATABASE_URL invalid"),
  FRONT_URL: z.url("Format FRONT_URL invalid"),

  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)),
  SMTP_USER: z.email("SMTP_USER must be email Format"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD cannot be empty"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format);
    console.error(parsedEnv.error.message);
    process.exit(1);
}

export const env = parsedEnv.data;

export const isDev = env.NODE_ENV === "development";