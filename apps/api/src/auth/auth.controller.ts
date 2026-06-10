// 📌 /auth 경로의 회원가입, 로그인, 내 정보 조회 API를 제공한다.
import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
    email: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 새 사용자를 생성하고 바로 사용할 수 있는 JWT를 반환한다.
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.name, dto.password);
  }

  // 이메일과 비밀번호를 검증하고 JWT를 반환한다.
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // JWT가 유효한 사용자만 자신의 정보를 조회할 수 있다.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user.userId);
  }
}
