import z from "zod";

const configSchema = z.object({
    DATABASE_URL: z.url(),
    NODE_ENV: z.string(),
    BASE_URL: z.url().nullable(),
    FRONT_URL: z.url(),
});

const envParsed = configSchema.safeParse(process.env);

if (envParsed.error) {
    console.log("Environment variables are not set correctly:");
    console.log(envParsed.error.issues[0].message + envParsed.error.cause);
    process.exit(1);
}

export const env = envParsed.data;
