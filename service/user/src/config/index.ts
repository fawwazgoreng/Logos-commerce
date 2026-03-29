import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SECRET_KEY: z.string().min(8, "Secret key terlalu pendek!"),
    DATABASE_URL: z.url("Format DATABASE_URL tidak valid"),
  FRONT_URL: z.url("Format FRONT_URL tidak valid"),

  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)),
  SMTP_USER: z.email("SMTP_USER harus berupa email valid"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD tidak boleh kosong"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format);
  process.exit(1);
}

export const env = parsedEnv.data;

export const isDev = env.NODE_ENV === "development";