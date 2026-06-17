// 📌 인증 기능에 필요한 Controller, Service, JWT 설정을 하나로 묶는 모듈.
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => {
        const expiresIn = (process.env.JWT_EXPIRES_IN ??
          '7d') as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

        return {
          secret: process.env.JWT_SECRET ?? 'development-only-jwt-secret',
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
