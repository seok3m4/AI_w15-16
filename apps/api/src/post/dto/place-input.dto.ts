// 📌 여행 코스 경유지(장소) 하나의 입력 구조와 검증 규칙.
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PlaceInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  // 위도/경도는 지도 좌표가 가질 수 있는 범위를 벗어나지 않도록 검증한다.
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  // 며칠차에 방문하는 장소인지. 입력하지 않으면 1일차로 저장한다.
  @IsOptional()
  @IsInt()
  @Min(1)
  day?: number;

  // 코스 내에서의 방문 순서. 0부터 시작한다.
  @IsInt()
  @Min(0)
  order: number;
}
