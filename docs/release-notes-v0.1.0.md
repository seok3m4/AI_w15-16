# KBO Talk Web + Android MVP

KBO Talk는 KBO 경기 리뷰, 선수 기록, 팀 이슈, 뉴스 브리핑을 다루는 비공식 야구 팬 커뮤니티 포트폴리오 프로젝트입니다.

## Web

- Web Demo: `https://<vercel-domain>`
- Mobile App Route: `https://<vercel-domain>/mobile-app`
- KBO App Improvement Case Study: `https://<vercel-domain>/portfolio/kbo-app`

## Android APK

이 Release에는 Android WebView 기반 KBO Fan Hub APK를 첨부합니다.

앱은 배포된 웹의 `/mobile-app` 화면을 로드하며, 게시판/경기방/기록실/뉴스/MY 탭을 모바일 앱 흐름으로 제공합니다.

## Highlights

- KBO 야구 커뮤니티 게시판
- 회원가입, 로그인, 게시글 CRUD, 댓글, 태그, 검색, 페이지네이션
- 조회수, 추천/비추천, 인기글
- KBO 경기방, 박스스코어, 라인업, 문자중계, 순위/기록실
- RAG 기반 유사 글 추천, 중복 글 방지, 경기/팀별 관련 글 요약
- MCP 기반 KBO 경기 정보, 공식 기록, 뉴스/URL 브리핑
- Agent 기반 경기 리뷰 초안, 모더레이션, 야구 도우미, 경기 승부 예측
- PWA manifest, service worker, Android deep link, Android share intent

## Notes

이 프로젝트는 KBO 공식 앱이 아닌 개인 포트폴리오용 비공식 팬 커뮤니티 프로젝트입니다.

OpenAI API와 Supabase PostgreSQL을 사용하므로 배포 환경에서는 환경변수 설정이 필요합니다.
