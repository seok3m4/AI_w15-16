// 📌 AI 코스 초안 생성 요청 본문 검증용 DTO.
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DraftDto {
  @IsString()
  @MinLength(2, { message: '요청은 2자 이상이어야 합니다.' })
  @MaxLength(500, { message: '요청은 500자 이하여야 합니다.' })
  request: string;
}
