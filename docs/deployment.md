# Deployment Guide

KBO Talk는 Next.js 웹 앱과 Android WebView 앱을 함께 포트폴리오로 보여주는 구조입니다.

배포 목표는 다음 순서입니다.

1. Supabase PostgreSQL 생성
2. pgvector 확장 활성화
3. Vercel에 Next.js 웹 배포
4. Supabase DB에 Prisma migration 적용
5. 배포 URL로 웹 동작 확인
6. Android 앱의 `KBO_WEB_APP_URL`을 배포 URL로 변경
7. Android APK 빌드
8. GitHub Release에 APK 업로드

## 1. 사전 준비

필요한 계정과 도구:

- GitHub 계정
- Supabase 계정
- Vercel 계정
- OpenAI API Key
- Android Studio

현재 로컬에 `vercel`, `supabase`, `gh` CLI가 없으면 웹 콘솔 기준으로 진행해도 됩니다.

```powershell
vercel --version
supabase --version
gh --version
```

## 2. Supabase DB 생성

Supabase에서 새 프로젝트를 만들고 PostgreSQL 연결 문자열을 준비합니다.

Supabase Dashboard 기준 흐름:

1. `New project` 생성
2. Region은 가까운 곳 선택
3. Database password 저장
4. `Project Settings > Database`에서 connection string 복사

Vercel/Prisma에는 보통 direct connection string을 먼저 사용합니다.

예시:

```env
DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?schema=public"
```

## 3. pgvector 설정

이 프로젝트의 migration에는 아래 SQL이 포함되어 있습니다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

그래도 Supabase SQL Editor에서 먼저 한 번 실행해두면 문제 원인을 줄일 수 있습니다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

확인:

```sql
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

## 4. Vercel 환경변수

Vercel 프로젝트를 GitHub 저장소와 연결합니다.

- Repository: `kominsuk1064/jungle-ai-board` 또는 팀 저장소의 `kominsuk` 브랜치
- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`

Vercel 환경변수:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="32자 이상 랜덤 문자열"
OPENAI_API_KEY="sk-..."
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_EMBEDDING_DIMENSIONS="1536"
OPENAI_CHAT_MODEL="gpt-4o-mini"
MCP_SHARED_SECRET="랜덤 문자열"
```

`AUTH_SECRET`와 `MCP_SHARED_SECRET`는 PowerShell에서 임시로 만들 수 있습니다.

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Prisma migration 적용

Vercel 배포 전에 Supabase DB에 migration을 적용합니다.

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?schema=public"
npm.cmd run db:deploy
npx.cmd prisma migrate status
```

주의:

- 로컬 `.env`에 Supabase `DATABASE_URL`을 넣고 실행해도 됩니다.
- `.env`는 GitHub에 올리지 않습니다.
- `prisma migrate dev`는 로컬 개발용이고, 배포 DB에는 `prisma migrate deploy`를 사용합니다.

## 6. 웹 배포 확인

Vercel 배포가 끝나면 아래 경로를 확인합니다.

```text
https://<vercel-domain>/
https://<vercel-domain>/mobile-app
https://<vercel-domain>/records
https://<vercel-domain>/news
https://<vercel-domain>/portfolio/kbo-app
https://<vercel-domain>/manifest.webmanifest
https://<vercel-domain>/sw.js
```

로컬에서 배포 전 검증:

```powershell
npm.cmd run deploy:check
npm.cmd run verify:kbo-app
```

Vercel 배포 후 실제 URL 검증:

```powershell
npm.cmd run deploy:verify -- https://<vercel-domain>
```

## 7. Android 앱 URL 변경

웹 배포 URL이 확정되면 Android 앱이 로드할 URL을 바꿉니다.

```powershell
npm.cmd run android:set-url -- url https://<vercel-domain>/mobile-app
```

반영 확인:

```powershell
Get-Content android/gradle.properties
```

개발용으로 되돌릴 때:

```powershell
npm.cmd run android:set-url -- emulator
```

## 8. Android release APK 빌드

먼저 Android 환경을 확인합니다.

```powershell
npm.cmd run verify:android:env
npm.cmd run verify:android
```

release APK 빌드:

```powershell
npm.cmd run android:release
```

산출물 위치:

```text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

`android/keystore.properties`가 없으면 unsigned APK가 만들어질 수 있습니다.
포트폴리오에서 실제 설치 가능한 APK를 공유하려면 release signing을 설정합니다.

## 9. Android release signing

keystore 파일은 절대 GitHub에 올리지 않습니다.

keystore 생성 예시:

```powershell
keytool -genkeypair -v -keystore android/kbo-fan-hub-release.jks -alias kbo-fan-hub -keyalg RSA -keysize 2048 -validity 10000
```

`android/keystore.properties` 생성:

```properties
storeFile=kbo-fan-hub-release.jks
storePassword=<KEYSTORE_PASSWORD>
keyAlias=kbo-fan-hub
keyPassword=<KEY_PASSWORD>
```

이 파일들은 `.gitignore`에 포함되어 있습니다.

```text
/android/keystore.properties
/android/*.jks
/android/*.keystore
```

서명 설정 후 다시 빌드합니다.

```powershell
npm.cmd run android:release
```

## 10. GitHub Release 업로드

GitHub 웹 UI 기준:

1. 개인 저장소 `kominsuk1064/jungle-ai-board` 접속
2. `Releases > Draft a new release`
3. Tag: `v0.1.0`
4. Target: `kominsuk`
5. Title: `KBO Talk Web + Android MVP`
6. APK 업로드
7. 웹 배포 URL과 주요 기능 설명 작성

Release description 예시:

```markdown
## KBO Talk MVP

- Web: https://<vercel-domain>
- Android APK: attached file
- Mobile app route: https://<vercel-domain>/mobile-app

### Highlights

- KBO community board
- RAG similar posts and related game summary
- MCP news/URL and KBO game briefing
- Agent review assistant, moderation, board helper, game prediction
- Android WebView app with deep link and share flow

### Notes

This is an unofficial portfolio project for KBO fan community UX research and AI feature integration.
```

GitHub CLI를 설치하고 로그인했다면:

```powershell
gh auth login
gh release create v0.1.0 android/app/build/outputs/apk/release/app-release.apk --target kominsuk --title "KBO Talk Web + Android MVP" --notes-file docs/release-notes-v0.1.0.md
```

GitHub Actions로 자동 Release를 만들 수도 있습니다.

1. 개인 저장소 `Settings > Secrets and variables > Actions > Variables`로 이동합니다.
2. `KBO_WEB_APP_URL` 변수를 추가합니다.

```text
KBO_WEB_APP_URL=https://<vercel-domain>/mobile-app
```

3. tag를 만들고 push합니다.

```powershell
git tag v0.1.0
git push origin v0.1.0
```

그러면 `.github/workflows/android-release.yml`이 Android debug/release APK를 빌드하고 GitHub Release에 첨부합니다.

## 11. 포트폴리오 제출 링크 구성

최종적으로 아래 4개 링크를 포트폴리오에 정리합니다.

- Web Demo: `https://<vercel-domain>`
- Mobile App Demo: `https://<vercel-domain>/mobile-app`
- KBO App Improvement Case Study: `https://<vercel-domain>/portfolio/kbo-app`
- GitHub Release APK: `https://github.com/kominsuk1064/jungle-ai-board/releases/tag/v0.1.0`

README에는 실제 URL이 확정된 뒤 링크를 추가합니다.

URL placeholder는 스크립트로 한 번에 바꿀 수 있습니다.

```powershell
npm.cmd run deploy:update-links -- --web-url https://<vercel-domain>
```

GitHub Release URL도 함께 지정하려면:

```powershell
npm.cmd run deploy:update-links -- --web-url https://<vercel-domain> --release-url https://github.com/kominsuk1064/jungle-ai-board/releases/tag/v0.1.0
```

## 12. 배포 전 체크리스트

- [ ] Supabase DB 생성
- [ ] Supabase SQL Editor에서 `CREATE EXTENSION IF NOT EXISTS vector;` 실행
- [ ] Vercel 프로젝트 생성
- [ ] Vercel 환경변수 등록
- [ ] `npm.cmd run db:deploy` 실행
- [ ] Vercel 웹 배포 성공
- [ ] `/`, `/mobile-app`, `/portfolio/kbo-app` 확인
- [ ] Android 앱 URL을 Vercel URL로 변경
- [ ] release signing 설정
- [ ] `npm.cmd run android:release` 성공
- [ ] GitHub Release에 APK 업로드
- [ ] README에 Web/APK/Portfolio 링크 최신화
