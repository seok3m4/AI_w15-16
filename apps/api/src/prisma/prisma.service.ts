// 📌 NestJS에서 DB에 접근할 때 쓰는 서비스. 앱 시작 시 DB 연결, 종료 시 연결 해제.
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // DATABASE_URL을 읽어서 PostgreSQL용 Prisma Client를 초기화한다.
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize Prisma');
    }

    // Prisma 7에서는 PostgreSQL 연결에 driver adapter를 넘겨야 한다.
    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  // NestJS 앱이 시작될 때 DB 연결을 미리 열어둔다.
  async onModuleInit() {
    await this.$connect();
  }

  // NestJS 앱이 종료될 때 DB 연결을 정리한다.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
