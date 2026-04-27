import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "src/infrastructure/database/schema.prisma",
    migrations: {
        path: "src/infrastructure/database/migrations"
    },
    datasource: {
       url: process.env["DATABASE_URL"] 
    }  
})