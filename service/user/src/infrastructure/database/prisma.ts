import { PrismaPg } from "@prisma/adapter-pg";
import { databaseEnv, node_env } from "../../config";
import { PrismaClient } from "./generated/prisma/client";


const connectionString = databaseEnv;

declare global {
    var prisma : PrismaClient | undefined
}

const adapter = new PrismaPg({ connectionString });
const prisma = globalThis.prisma ?? new PrismaClient({ adapter , log: ["error" , "query" , "warn"]});

if (node_env != "production") {
    global.prisma = prisma;
}

export default prisma;