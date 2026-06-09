import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns API health metadata', () => {
      expect(appController.getHealth()).toEqual({
        status: 'ok',
        service: 'cine-review-api',
        database: 'configured',
      });
    });
  });
});
