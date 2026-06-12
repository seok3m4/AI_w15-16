# ECS Deployment And Testing Guide

## Purpose

이 문서는 ECS 서비스가 이미 실행 중인 상태에서 백엔드 서버 코드가 업데이트되었을 때 자동 배포가 어떤 순서로 이루어지는지, 그리고 사용자가 어떤 주소와 절차로 접속해 테스트하면 되는지를 정리합니다.

현재 `deploy.yml`은 ECR 이미지 push 이후 ECS task definition 렌더링, ECS service 배포, 서비스 안정화 대기, 선택적 smoke test까지 수행합니다.

## Current Repository State

구현된 자동화:

- `gyugo` 브랜치 push 또는 수동 실행으로 GitHub Actions가 실행됩니다.
- GitHub OIDC로 AWS 역할 `arn:aws:iam::489535778783:role/NammanmuGithubOidcTrustPolicy`을 Assume합니다.
- `backend/Dockerfile`로 Spring Boot 백엔드 이미지를 빌드합니다.
- 이미지를 ECR 저장소 `nammanmu/gyugo/backend`에 `${GITHUB_SHA}` 태그로 푸시합니다.
- 현재 ECS task definition `nammanmu-dev-nammanmu-gyugo-backend`을 내려받습니다.
- 새 ECR image URI를 `backend` 컨테이너 image 값에 반영합니다.
- ECS cluster `nammanmu-dev`의 service `nammanmu-gyugo-backend`를 새 task definition으로 배포합니다.
- `wait-for-service-stability: true`로 ECS service 안정화까지 대기합니다.
- `HEALTH_CHECK_URL`이 설정되어 있으면 curl smoke test를 실행합니다.
- `HEALTH_CHECK_URL`이 비어 있으면 smoke test를 건너뜁니다.

## Auto Deployment Flow

서버 업데이트는 다음 순서로 진행됩니다.

1. 개발자가 백엔드 코드를 수정하고 `gyugo` 브랜치에 push합니다.
2. `ci.yml`이 백엔드 테스트와 프론트엔드 빌드를 실행합니다.
3. `deploy.yml`이 GitHub OIDC로 AWS에 인증합니다.
4. GitHub Actions가 백엔드 Docker 이미지를 빌드합니다.
5. 이미지를 ECR에 `${GITHUB_SHA}` 태그로 푸시합니다.
6. GitHub Actions가 현재 ECS task definition을 내려받습니다.
7. 새 ECR image URI를 task definition의 `backend` 컨테이너에 반영합니다.
8. 새 task definition revision을 ECS에 등록합니다.
9. ECS service에 새 task definition revision을 배포합니다.
10. ECS는 rolling deployment 방식으로 새 task를 먼저 띄웁니다.
11. Application Load Balancer target group health check가 새 task를 healthy로 판정합니다.
12. 새 task가 healthy 상태가 되면 ALB가 새 task로 트래픽을 보냅니다.
13. 기존 task는 deregistration delay 이후 종료됩니다.
14. GitHub Actions는 ECS service stable 상태까지 대기합니다.
15. `HEALTH_CHECK_URL`이 있으면 smoke test를 실행합니다.
16. 사용자는 같은 ALB 주소로 접속하며, 배포 중에도 주소를 바꾸지 않습니다.

## AWS Values Used By Deploy Workflow

현재 `deploy.yml`의 배포 값:

```text
AWS_REGION: ap-northeast-2
AWS_ACCOUNT_ID: 489535778783
ECR_REPOSITORY: nammanmu/gyugo/backend
ECS_CLUSTER: nammanmu-dev
ECS_SERVICE: nammanmu-gyugo-backend
ECS_TASK_DEFINITION: nammanmu-dev-nammanmu-gyugo-backend
CONTAINER_NAME: backend
HEALTH_CHECK_URL: ""
```

`HEALTH_CHECK_URL`이 비어 있으므로 현재 workflow는 smoke test를 skip합니다. ALB DNS가 확정되면 다음처럼 설정할 수 있습니다.

```text
HEALTH_CHECK_URL: http://<alb-dns-name>/api/status
```

## Required AWS Resources

자동 배포가 정상 동작하려면 AWS에 다음 리소스가 준비되어 있어야 합니다.

- ECR repository: `nammanmu/gyugo/backend`
- ECS cluster: `nammanmu-dev`
- ECS service: `nammanmu-gyugo-backend`
- ECS task definition family: `nammanmu-dev-nammanmu-gyugo-backend`
- task definition container name: `backend`
- ECS task execution role: ECR pull, CloudWatch Logs write 권한 필요
- ECS task role: 애플리케이션이 AWS 리소스에 접근할 때 필요한 최소 권한
- Application Load Balancer
- Target group, target type `ip`
- ECS task security group, ALB security group
- CloudWatch Logs log group
- GitHub OIDC provider: `token.actions.githubusercontent.com`
- GitHub Actions 배포 역할

## How Users Access The Updated Server

ECS service가 ALB 뒤에서 실행 중이면 사용자는 배포 전후 동일한 ALB 주소로 접속합니다.

접속 주소 형식:

```text
http://<alb-dns-name>
```

확인할 엔드포인트:

```text
http://<alb-dns-name>/
http://<alb-dns-name>/login
http://<alb-dns-name>/api/status
http://<alb-dns-name>/swagger-ui.html
http://<alb-dns-name>/v3/api-docs
```

로그인 테스트 계정:

```text
ID: user
PW: password
```

## Smoke Test Checklist

배포 후 다음 순서로 확인합니다.

1. GitHub Actions의 `Deploy Backend To ECS` workflow가 성공했는지 확인합니다.
2. ECR에 `${GITHUB_SHA}` 태그 이미지가 생성되었는지 확인합니다.
3. ECS service의 deployment가 `PRIMARY`이고 rollout이 완료되었는지 확인합니다.
4. ECS task가 `RUNNING` 상태인지 확인합니다.
5. ALB target group에서 새 task target이 `healthy`인지 확인합니다.
6. 브라우저에서 `http://<alb-dns-name>/api/status`에 접속해 JSON 응답을 확인합니다.
7. 브라우저에서 `http://<alb-dns-name>/login`에 접속해 로그인 화면을 확인합니다.
8. `user` / `password`로 로그인해 `/` 홈 화면에 진입되는지 확인합니다.
9. `http://<alb-dns-name>/swagger-ui.html`에서 Swagger UI가 열리는지 확인합니다.
10. CloudWatch Logs에서 새 task의 애플리케이션 로그가 출력되는지 확인합니다.

정상 상태의 `/api/status` 응답:

```json
{
  "service": "Jungle AI Backend",
  "status": "running",
  "message": "Backend API is connected."
}
```

## Troubleshooting

### GitHub Actions에서 ECS 배포 단계가 실패하는 경우

- GitHub OIDC 역할에 `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`, `ecs:UpdateService`, `iam:PassRole` 권한이 있는지 확인합니다.
- task definition family 이름이 `ECS_TASK_DEFINITION` 값과 일치하는지 확인합니다.
- container name이 `CONTAINER_NAME` 값인 `backend`와 일치하는지 확인합니다.
- ECS service와 cluster 이름이 `deploy.yml`의 env 값과 일치하는지 확인합니다.

### GitHub Actions는 성공했지만 서버가 바뀌지 않는 경우

- ECS service의 active task definition revision이 새 revision인지 확인합니다.
- task definition image가 새 `${GITHUB_SHA}` 이미지 URI를 가리키는지 확인합니다.
- ALB target group이 새 task를 healthy로 보고 있는지 확인합니다.

### ECS task가 바로 종료되는 경우

- CloudWatch Logs에서 Spring Boot 시작 오류를 확인합니다.
- task memory/cpu가 부족하지 않은지 확인합니다.
- task execution role이 ECR pull과 CloudWatch Logs write 권한을 갖는지 확인합니다.

### ALB에서 502 또는 503이 나는 경우

- target group health check path와 Spring Boot 응답 경로가 맞는지 확인합니다.
- task security group이 ALB security group의 inbound 요청을 허용하는지 확인합니다.
- container port와 target group port가 `8080` 기준으로 맞는지 확인합니다.

### Smoke test가 skip되는 경우

- `HEALTH_CHECK_URL`이 빈 문자열이면 정상적으로 skip됩니다.
- 자동 smoke test를 켜려면 ALB DNS가 확정된 뒤 `HEALTH_CHECK_URL`을 `http://<alb-dns-name>/api/status`로 설정합니다.

### 로컬 프론트엔드에서 배포 백엔드를 호출하려는 경우

- 현재 Vite 개발 서버는 `/api`를 `http://localhost:8080`으로 proxy합니다.
- 배포된 백엔드를 직접 호출하려면 `VITE_API_BASE_URL`과 `VITE_BACKEND_ORIGIN` 값을 ALB 주소로 맞추는 배포 구성이 필요합니다.
- 현재 백엔드에는 별도 CORS 설정이 없으므로, 운영 프론트엔드는 같은 도메인 또는 ALB/API gateway 경로 설계를 맞추는 것이 안전합니다.

## Recommended Next Repository Changes

- ALB DNS 확정 후 `HEALTH_CHECK_URL` 설정
- ALB health check path를 `/api/status` 또는 별도 health endpoint로 고정
- 배포 성공 후 더 엄격한 smoke test를 자동 실행하는 GitHub Actions step 추가
- 운영 프론트엔드 배포 경로와 백엔드 호출 도메인 확정
