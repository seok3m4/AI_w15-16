// 📌 선택적 JWT 가드. 토큰이 없거나 유효하지 않아도 요청을 통과시키되,
// 유효한 토큰이 있으면 request.user에 사용자 정보를 채운다. (저장 여부 표시 등에 사용)
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // 기본 동작은 인증 실패 시 예외를 던지지만, 여기서는 user가 없으면 null로 통과시킨다.
  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser | null {
    return user ?? null;
  }
}
