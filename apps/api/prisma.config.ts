// 📌 Prisma CLI 설정. 루트 .env를 읽어서 DATABASE_URL을 Prisma에 전달한다.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI commands run inside apps/api, so load the root .env explicitly.
config({ path: "../../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
