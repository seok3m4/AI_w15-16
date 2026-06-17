import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  // 회원가입은 비밀번호를 해시한 뒤 유저를 만들고 JWT를 반환해야 한다.
  it('creates a user with a hashed password and returns a token on signup', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user_1',
      email: 'minji@example.com',
      name: '김민지',
      passwordHash: 'hashed_password',
    });
    mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

    await expect(
      authService.signup('minji@example.com', '김민지', 'password123'),
    ).resolves.toEqual({
      accessToken: 'signed.jwt.token',
      user: {
        id: 'user_1',
        email: 'minji@example.com',
        name: '김민지',
      },
    });

    expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'minji@example.com',
        name: '김민지',
        passwordHash: 'hashed_password',
      },
    });
  });

  // 이미 존재하는 이메일이면 회원가입을 막아야 한다.
  it('throws 400 when signup email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'minji@example.com',
    });

    await expect(
      authService.signup('minji@example.com', '김민지', 'password123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 로그인은 비밀번호가 맞을 때만 JWT를 반환해야 한다.
  it('returns a token when login password is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'minji@example.com',
      name: '김민지',
      passwordHash: 'hashed_password',
    });
    mockedBcrypt.compare.mockResolvedValue(true as never);

    await expect(
      authService.login('minji@example.com', 'password123'),
    ).resolves.toEqual({
      accessToken: 'signed.jwt.token',
      user: {
        id: 'user_1',
        email: 'minji@example.com',
        name: '김민지',
      },
    });
  });

  // 이메일이 없거나 비밀번호가 틀리면 401을 반환해야 한다.
  it('throws 401 when login password is invalid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'minji@example.com',
      name: '김민지',
      passwordHash: 'hashed_password',
    });
    mockedBcrypt.compare.mockResolvedValue(false as never);

    await expect(
      authService.login('minji@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // 내 정보 조회는 passwordHash를 제외한 사용자 정보만 반환해야 한다.
  it('returns current user without passwordHash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'minji@example.com',
      name: '김민지',
    });

    await expect(authService.getMe('user_1')).resolves.toEqual({
      id: 'user_1',
      email: 'minji@example.com',
      name: '김민지',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
});
