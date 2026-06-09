import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              count: jest.fn().mockResolvedValue(2),
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns API health metadata with DB user count', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
        service: 'cine-review-api',
        database: 'connected',
        userCount: 2,
      });
    });
  });
});
