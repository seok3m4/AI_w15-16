# CI/CD ECS Deployment

## Where It Appears

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/aws-role.yml`
- `backend/Dockerfile`
- `nammanmu-relaxed-cicd-aws-architecture.drawio`
- `docs/ecs-deployment-testing-guide.md`

## What Was Applied

- GitHub Actions를 CI와 배포 이미지 생성 흐름으로 분리했다.
- CI는 `gyugo` 브랜치 push와 pull request에서 백엔드 테스트와 프론트엔드 빌드를 검증한다.
- 배포 workflow는 GitHub OIDC로 AWS 역할을 Assume한 뒤 백엔드 Docker 이미지를 ECR에 push한다.
- Docker 이미지는 `${GITHUB_SHA}` 태그를 사용해 어떤 커밋이 배포 후보 이미지인지 추적할 수 있게 했다.
- ECS 자동 배포는 ECR image push 이후 현재 task definition을 내려받고, 새 image URI를 렌더링한 뒤 ECS service update로 이어진다.
- `wait-for-service-stability: true`로 ECS 서비스가 안정 상태가 될 때까지 workflow가 대기한다.
- `HEALTH_CHECK_URL`이 설정되면 배포 후 curl 기반 smoke test를 실행하고, 비어 있으면 smoke test를 건너뛴다.

## Why It Matters

- 장기 AWS access key를 GitHub secret에 저장하지 않고 OIDC 기반 단기 자격 증명을 사용할 수 있다.
- 커밋 SHA 기반 이미지 태그는 롤백과 배포 추적을 단순하게 만든다.
- ECS rolling deployment는 새 task가 healthy가 된 뒤 기존 task를 내리므로, 사용자는 같은 ALB 주소로 접속하면서 서버 업데이트를 확인할 수 있다.
- 배포 workflow가 ECS service 안정화까지 기다리므로 GitHub Actions 실행 결과로 배포 성공 여부를 빠르게 확인할 수 있다.

## Verification

- `.github/workflows/ci.yml`: Java 21 백엔드 테스트와 Node 20 프론트엔드 빌드 workflow가 정의되어 있다.
- `.github/workflows/deploy.yml`: OIDC 인증, ECR 로그인, Docker build/push, task definition render, ECS service deploy, 선택적 smoke test step이 정의되어 있다.
- `.github/workflows/aws-role.yml`: OIDC 역할 검증을 위해 `aws sts get-caller-identity` step이 정의되어 있다.
- `backend/Dockerfile`: Maven package 후 JRE 이미지에서 `app.jar`를 실행하도록 구성되어 있다.

## Pitfalls And Follow-Ups

- ECS service update가 실패하면 새 이미지는 ECR에 남아 있어도 실행 중인 서비스는 이전 task definition을 유지할 수 있다.
- cluster, service, task definition family, container name을 실제 AWS 값과 계속 일치시켜야 한다.
- ALB health check path가 애플리케이션에서 항상 `200`을 반환하는 경로여야 배포가 안정적으로 완료된다.
- `HEALTH_CHECK_URL`이 비어 있으면 GitHub Actions smoke test는 의도적으로 건너뛴다.
- 프론트엔드 운영 배포는 현재 백엔드 Docker 배포와 별도이다. 운영 프론트엔드에서 백엔드를 호출하려면 도메인, CORS, proxy 설계를 함께 확정해야 한다.
