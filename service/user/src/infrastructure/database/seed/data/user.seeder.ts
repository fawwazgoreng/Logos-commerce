import { PrismaClient } from "../../generated/prisma";
import { BaseSeeder } from "../base.seeder";
import Bun from "bun";

export class UserSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma);
    }

    async run(): Promise<void> {
        await this.truncate("User");

        const users = [
            {
                username: "admin",
                email: "admin@example.com",
                roles: "admin",
                password: await Bun.password.hash("password123"),
                image: "https://placeholder.com/admin.jpg",
                is_verify: true,
                verify_at: new Date(),
            },
            {
                username: "seller",
                email: "seller@example.com",
                roles: "seller",
                password: await Bun.password.hash("password123"),
                image: "https://placeholder.com/seller.jpg",
                is_verify: true,
                verify_at: new Date(),
            },
            {
                username: "user",
                email: "user@example.com",
                roles: "user",
                password: await Bun.password.hash("password123"),
                image: "https://placeholder.com/user.jpg",
                is_verify: false,
                verify_at: null,
            },
        ];

        await this.prisma.user.createMany({ data: users });
        this.log(`Seeded ${users.length} users`);
    }
}
