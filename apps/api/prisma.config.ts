// 📌 Prisma CLI 설정. 루트 .env를 읽어서 DATABASE_URL을 Prisma에 전달한다.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI 명령은 apps/api 기준으로 실행되므로 루트 .env 경로를 직접 지정한다.
config({ path: "../../.env" });

// schema 위치, migration 위치, DB 연결 문자열을 Prisma CLI에 알려준다.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
