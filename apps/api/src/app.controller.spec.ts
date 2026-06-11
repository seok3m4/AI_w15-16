import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

// AppController가 /health 요청을 AppService로 잘 연결하는지 확인하는 단위 테스트.
describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          // 단위 테스트에서는 실제 DB 대신 PrismaService의 post.count만 가짜로 만든다.
          useValue: {
            post: {
              count: jest.fn().mockResolvedValue(3),
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    // /health 응답에 DB postCount가 포함되는지 검증한다.
    it('returns API health metadata with DB post count', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
        service: 'travel-course-api',
        database: 'connected',
        postCount: 3,
      });
    });
  });
});
