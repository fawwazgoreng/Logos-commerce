import { PrismaClient } from '../../generated/prisma'
import { BaseSeeder } from '../base.seeder'

export class CodeVerificationSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  async run(): Promise<void> {
    await this.truncate('code_verification')

    const unverifiedUsers = await this.prisma.user.findMany({
      where: { is_verify: false }
    })

    const codes = unverifiedUsers.map(user => ({
      user_id: user.id,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      status: 'pending',
      expired: new Date(Date.now() + 1000 * 60 * 60),
    }))

    await this.prisma.code_verification.createMany({ data: codes })
    this.log(`Seeded ${codes.length} verification codes`)
  }
}