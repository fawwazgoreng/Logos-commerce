export const databaseEnv = process.env["DATABASE_URL"];

export const node_env = process.env["NODE_ENV"] ?? "development";

export const secret_key = String(process.env["SECRET_KEY"]);