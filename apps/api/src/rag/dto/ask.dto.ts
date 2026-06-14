// 📌 게시판 Q&A 요청 본문 검증용 DTO.
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AskDto {
  @IsString()
  @MinLength(2, { message: '질문은 2자 이상이어야 합니다.' })
  @MaxLength(500, { message: '질문은 500자 이하여야 합니다.' })
  question: string;
}
