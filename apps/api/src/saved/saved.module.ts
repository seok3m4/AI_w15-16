// 📌 게시글 저장(북마크) 기능 모듈. 저장 로직은 PostService를 재사용한다.
import { Module } from '@nestjs/common';
import { PostModule } from '../post/post.module';
import { SavedController } from './saved.controller';

@Module({
  imports: [PostModule],
  controllers: [SavedController],
})
export class SavedModule {}
