# 문서 지도 (Docs Index) — Memento 텍스트 Memory MVP

이 폴더는 라이프사이클 순서(번호)대로 정리되어 있다. 처음 들어온 에이전트 세션은 **위에서 아래로** 읽으면 맥락이 잡힌다.

| 폴더 | 성격 | 문서 |
|------|------|------|
| `00-product/` | 왜·무엇 (제품·요구) | [PRODUCT_IDEATION](00-product/PRODUCT_IDEATION.md) · [REQUIREMENTS](00-product/REQUIREMENTS.md) |
| `01-design/` | 어떻게 (시스템 설계) | [ARCHITECTURE](01-design/ARCHITECTURE.md) · [ERD](01-design/ERD.md) · [API_SPEC](01-design/API_SPEC.md) |
| `02-frontend/` | 어떻게 (화면·디자인) | [SCREEN_FLOW](02-frontend/SCREEN_FLOW.md) · [DESIGN_SYSTEM](02-frontend/DESIGN_SYSTEM.md) · [FRONTEND_CONTRACT](02-frontend/FRONTEND_CONTRACT.md) · [preview](02-frontend/preview/memento-style-preview.html) |
| `03-execution/` | **작업지시 (구현)** | ⭐ [WORK_ORDER](03-execution/WORK_ORDER.md) · [DECISION_AND_TRACKING_LOG](03-execution/DECISION_AND_TRACKING_LOG.md) |
| `04-deployment/` | 배포 | [DEPLOYMENT](04-deployment/DEPLOYMENT.md) (Track A 로컬 / Track B AWS) |
| `archive/` | 보관 (스테일) | [SCREEN_FLOW_DESIGN_PLAN](archive/SCREEN_FLOW_DESIGN_PLAN.md) |

## 구현을 시작한다면

⭐ **[03-execution/WORK_ORDER.md](03-execution/WORK_ORDER.md) 하나가 작업지시서다.** 트랙(누가 무엇을), 단계별 작업(무엇을 어떤 순서로), 충돌 회피 규칙이 모두 들어 있다. 진행 상태·의사결정은 옆의 [DECISION_AND_TRACKING_LOG.md](03-execution/DECISION_AND_TRACKING_LOG.md)에 기록한다.

설계 근거가 필요할 때만 `00`~`02`, 배포는 `04`를 참조한다. 저장소 전역 규범은 루트 [`AGENTS.md`](../AGENTS.md)에 있다.
