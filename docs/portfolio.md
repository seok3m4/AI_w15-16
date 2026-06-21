# Portfolio Summary

KBO Talk는 KBO 야구 커뮤니티 게시판을 웹과 Android 앱 형태로 확장한 포트폴리오 프로젝트입니다.

## Links

```text
Web Demo: https://<vercel-domain>
Mobile App: https://<vercel-domain>/mobile-app
KBO App Improvement Case Study: https://<vercel-domain>/portfolio/kbo-app
GitHub Repository: https://github.com/kominsuk1064/jungle-ai-board
Android APK Release: https://github.com/kominsuk1064/jungle-ai-board/releases/tag/v0.1.0
```

## One-line Description

KBO 경기 리뷰, 기록실, 뉴스, 경기방, 커뮤니티 게시판을 하나로 묶고 RAG, MCP, AI Agent 기능을 사용자 흐름 안에 녹인 비공식 야구 팬 커뮤니티 웹/앱입니다.

## What To Show

1. 웹 메인에서 게시글, 오늘의 경기, 인기글, 야구 도우미 확인
2. 글쓰기에서 유사 글 확인과 리뷰 초안 생성
3. 경기방에서 스코어, 라인업, 박스스코어, 문자중계, 관련 글 요약 확인
4. 뉴스 페이지에서 URL 브리핑 확인
5. 기록실에서 팀 순위와 선수 기록 확인
6. `/mobile-app`에서 앱형 홈/경기/기록/뉴스/MY 탭 확인
7. `/portfolio/kbo-app`에서 KBO 앱 개선 분석과 구현 매핑 확인
8. Android APK 설치 후 WebView 앱, 딥링크, 공유, 이미지 첨부 흐름 확인

## Technical Highlights

- Next.js App Router + React + TypeScript
- PostgreSQL + Prisma + pgvector
- OpenAI API + LangChain.js
- RAG: 유사 게시글 추천, 중복 글 방지, 경기/팀별 관련 글 요약
- MCP: JSON-RPC 기반 KBO 경기/기록/뉴스 URL 브리핑 도구
- Agent: 리뷰 초안, 모더레이션, 야구 도우미, 승부 예측
- PWA: manifest, service worker, install prompt
- Android: WebView, deep link, share intent, file chooser, notification bridge

## Portfolio Positioning

이 프로젝트는 KBO 공식 앱을 대체하려는 서비스가 아니라, 공개된 공식 웹/모바일 화면과 앱스토어 정보를 참고해 팬 커뮤니티 관점에서 개선 아이디어를 구현한 개인 포트폴리오 프로젝트입니다.
