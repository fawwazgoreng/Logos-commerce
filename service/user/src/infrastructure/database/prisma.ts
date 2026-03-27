import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "../../config";


const connectionString = env.DATABASE_URL;

declare global {
    var prisma : PrismaClient | undefined
}

const adapter = new PrismaPg({ connectionString });
const prisma = globalThis.prisma ?? new PrismaClient({ adapter , log: ["error" , "query" , "warn"]});

if (env.NODE_ENV != "production") {
    global.prisma = prisma;
}

export default prisma;