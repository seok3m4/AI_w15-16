<div align="center">

# 🧠 Memento

**기억을 저장하는 SNS가 아니라, 기억을 다시 꺼내 쓰는 SNS.**

사진과 게시글로 쌓인 개인의 기억을 AI가 이해하고,<br/>
사용자가 허용한 범위 안에서 외부 LLM 에이전트와 컨텍스트를 주고받는<br/>
**메모리 개인화 SNS 플랫폼**

</div>

---

## Overview

> 일반 SNS가 **지금 공유하는 콘텐츠**에 초점을 둔다면,
> Memento는 **시간이 지나며 누적되는 개인의 기억**을 다시 검색하고 활용하는 데 초점을 둔다.

**Memento**는 사용자가 남긴 사진, 게시글, 댓글, 태그를 단순 콘텐츠가 아니라 AI가 활용할 수 있는 **개인 메모리 컨텍스트**로 구조화하는 서비스다.

사용자는 일상 기록을 남기고, 서비스는 이를 기반으로 다음 경험을 제공한다.

* 자연어 기반 과거 기억 검색
* 이미지 캡션, OCR, AI 추천 태그 생성
* 외부 LLM이 재사용 가능한 Context Capsule 생성
* 주간 회고, 기억 추천, Notion 내보내기 Agent Workflow
* MCP 기반 외부 LLM 클라이언트 연동

---

## ✨ Core Experience

| 기능                     | 설명                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------ |
| 📝 **Memory Post**     | 게시글, 이미지, 댓글, 태그를 저장하고 사진 캡션, OCR, AI 추천 태그를 함께 기억으로 만든다.                            |
| 🔍 **Memory Search**   | 자연어 질문으로 과거 게시글, 사진 분석 결과, 태그를 검색하고 근거 게시글이 포함된 답변을 받는다.                             |
| 📦 **Context Capsule** | 외부 LLM이 재사용할 수 있도록 특정 목적의 개인 컨텍스트 묶음을 생성한다.                                          |
| 🤖 **Agent Workflow**  | 주간 회고, 비슷한 기억 추천, Notion 내보내기처럼 기억 기반 작업을 승인 흐름 안에서 실행한다.                            |
| 🔗 **MCP Integration** | 외부 LLM 클라이언트가 허용된 scope 안에서 memory tool, context capsule, prompt/resource를 사용할 수 있다. |

---

## 🔁 Service Flow

```text
사용자 기록 작성
  ↓
게시글 / 이미지 / 댓글 / 태그 저장
  ↓
이미지 캡션 · OCR · AI 추천 태그 생성
  ↓
텍스트 및 이미지 분석 결과 임베딩
  ↓
PostgreSQL + pgvector 저장
  ↓
RAG 기반 자연어 검색
  ↓
게시글 기반 답변 생성
  ↓
Context Capsule / Agent Workflow / MCP 연동
```

---

## 🏗 Architecture

```text
Client
  ↓
React Frontend
  ↓
Spring Boot Backend API
  ├── PostgreSQL + pgvector
  │     └── Post / Comment / Tag / Embedding
  │
  └── FastAPI AI Server
        ├── RAG Pipeline
        ├── Image Captioning / OCR
        ├── Agent Workflow
        └── MCP Integration
              ↓
        External LLM Client
```

---

## 🛠 Tech Stack

| 영역              | 기술 스택                            |
| --------------- | -------------------------------- |
| **Frontend**    | React, Vite                      |
| **Backend API** | Spring Boot                      |
| **AI Service**  | FastAPI                          |
| **Database**    | PostgreSQL, pgvector             |
| **AI / Agent**  | OpenAI API, LangChain, LangGraph |
| **Integration** | MCP                              |
| **Infra**       | Docker Compose                   |

---

## 📂 Repository Structure

```text
.
├── ai-server/             # AI Agent, RAG, LLM 연동 서비스
├── backend/               # Spring Boot 기반 핵심 비즈니스 API
├── frontend/              # React 기반 웹 클라이언트
├── docs/                  # 요구사항, 설계, 아키텍처, API 문서
├── scripts/               # 개발·배포·테스트 자동화 스크립트
├── docker-compose.yml     # 로컬 개발 환경 구성
├── docker-compose.app.yml # 애플리케이션 통합 실행 구성
└── .env.example           # 환경 변수 예시
```

---

## 🚀 Quick Start

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

### 2. PostgreSQL 실행

```bash
docker compose up -d postgres
```

### 3. Backend 실행

```bash
cd backend
./gradlew bootRun
```

### 4. AI Server 실행

```bash
cd ai-server

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend 실행

```bash
cd frontend

npm install
npm run dev
```

> 💡 Windows PowerShell 명령과 smoke / verification runbook은 [로컬 개발 문서](docs/LOCAL_DEVELOPMENT.md)를 참고한다.

---

## 🩺 Health Checks

| 서비스         | 엔드포인트                                  |
| ----------- | -------------------------------------- |
| Spring Boot | `GET http://localhost:8080/api/health` |
| FastAPI     | `GET http://localhost:8000/health`     |
| React       | `http://localhost:5173`                |

---