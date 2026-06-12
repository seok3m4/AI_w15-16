# Documentation CI/CD ECS Work Log

## Request Date And Time

- 2026-06-11 16:33:05 +09:00

## Objective

- 지금까지 진행된 백엔드, 프론트엔드, 문서화, GitHub Actions, AWS 배포 설계 작업을 루트 README에 정리한다.
- ECS가 실행 중인 상태에서 서버 업데이트 후 자동 배포가 어떤 순서로 진행되는지 별도 운영 문서로 정리한다.
- 사용자가 배포된 서버에 접속해 smoke test할 수 있는 경로와 체크리스트를 문서화한다.
- 프롬프트 원문은 저장하지 않고, 작업 요약만 문서화한다.

## Changed Files

- `README.md`
- `docs/README.md`
- `docs/ecs-deployment-testing-guide.md`
- `docs/concepts/README.md`
- `docs/concepts/cicd-ecs-deployment.md`
- `docs/work-logs/2026-06-11-documentation-cicd-ecs.md`

## Key Implementation Decisions

- 루트 README는 깨져 보이던 기존 내용을 대체해 현재 프로젝트 상태를 한국어로 다시 정리했다.
- CI/CD 자동화는 실제 workflow 파일 기준으로 `ci.yml`, `deploy.yml`, `aws-role.yml`, `automation.yml`을 분리 설명했다.
- `deploy.yml`은 ECR image push 이후 ECS task definition render와 ECS service update까지 수행하는 구조로 갱신되었으므로, README와 ECS guide를 현재 workflow 기준으로 맞췄다.
- ECS 운영 문서는 현재 상태와 목표 자동 배포 흐름을 분리했다.
- 실제 AWS ECS cluster, service, task definition 이름은 저장소에 없으므로 문서에는 치환값으로 남기고, 확정 후 실제 값으로 바꾸도록 안내했다.
- CI/CD와 ECS 배포 흐름은 `docs/concepts/cicd-ecs-deployment.md`에 개념 문서로도 분리했다.
- 신규 개념 문서가 찾기 쉽도록 `docs/concepts/README.md` 인덱스를 갱신했다.
- 프롬프트 원문은 저장하지 않았다.

## Verification

- `git diff --check`: exit code 0. trailing whitespace 오류 없음. README와 docs README의 LF to CRLF 경고만 출력됨.
- `git status --short`: `README.md`, `docs/README.md`, `docs/concepts/README.md` 수정과 `docs/ecs-deployment-testing-guide.md`, `docs/concepts/cicd-ecs-deployment.md`, `docs/work-logs/2026-06-11-documentation-cicd-ecs.md` 신규 파일 확인.
- `Test-Path`: README, docs index, ECS guide, concepts index, CI/CD concept, work log 파일 존재 확인.
- `Select-String -Path README.md,docs\README.md,docs\concepts\README.md,docs\ecs-deployment-testing-guide.md,docs\work-logs\2026-06-11-documentation-cicd-ecs.md -Pattern "Deploy Backend To ECS|cicd-ecs-deployment|HEALTH_CHECK_URL|프롬프트 원문은 저장하지"`: README, ECS guide, 개념 인덱스, 작업 로그에 핵심 항목 반영 확인.

## Remaining Issues Or Follow-Up Work

- 실제 ALB DNS 값이 확정되면 `HEALTH_CHECK_URL`에 `/api/status` 같은 smoke test URL을 설정해야 한다.
- ECS cluster, service, task definition family, container name이 AWS에서 변경되면 `deploy.yml`과 문서 값을 함께 바꿔야 한다.
- 운영 프론트엔드 배포와 백엔드 호출 도메인/CORS/proxy 설계는 아직 별도 확정이 필요하다.
