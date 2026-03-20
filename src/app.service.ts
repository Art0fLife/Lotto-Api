import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello from NestJS API with Prisma Soft Delete PRO!';
  }

  // Admin endpoints moved to admin.service.ts
  // See: /api/admins for all admin operations
}
