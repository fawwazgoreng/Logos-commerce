import { PrismaClient } from '../../generated/prisma'
import { BaseSeeder } from '../base.seeder'

export class UserAuditSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  async run(): Promise<void> {
    await this.truncate('user_audit')

    const users = await this.prisma.user.findMany()

    const audits = users.map(user => ({
      ip_addres: '127.0.0.1',
      device_type: 'desktop',
      user_id: user.id,
      roles: user.roles,
      failed: false,
      action: 'LOGIN',
      failed_message: '',
    }))

    await this.prisma.user_audit.createMany({ data: audits })
    this.log(`Seeded ${audits.length} user audits`)
  }
}