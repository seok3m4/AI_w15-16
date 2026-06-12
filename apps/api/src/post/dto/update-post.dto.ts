// 📌 여행 코스 게시글 수정 요청 body 구조와 검증 규칙.
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PlaceInputDto } from './place-input.dto';

export class UpdatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  // 게시글에 붙일 태그 이름 목록. 없으면 기존 태그를 유지하지 않고 비운다.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  // 코스를 구성하는 경유지 목록. 보낸 경우에만 기존 경유지를 새 목록으로 교체한다.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PlaceInputDto)
  places?: PlaceInputDto[];
}
