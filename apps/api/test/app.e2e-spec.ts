import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          // e2e 테스트에서는 HTTP 라우팅만 확인하고, 실제 DB 대신 post.count를 가짜로 만든다.
          useValue: {
            post: {
              count: jest.fn().mockResolvedValue(12),
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // 현재 앱의 상태 확인 API가 HTTP 응답으로 정상 반환되는지 검증한다.
  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'travel-course-api',
        database: 'connected',
        postCount: 12,
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
