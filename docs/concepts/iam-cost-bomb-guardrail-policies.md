# IAM Cost-Bomb Guardrail Policies

## Where It Appears

- `NammanmuDeveloperAllow.relaxed.json`
- `NammanmuCostBombGuardrailDeny.relaxed.json`
- `NammanmuGithubDeployRolePolicy.relaxed.json`
- `NammanmuGithubOidcTrustPolicy.relaxed.example.json`
- `nammanmu-relaxed-cicd-aws-architecture.drawio`
- Notion page: https://app.notion.com/p/37c34a290ded81818b41ebaf9162b9dd

## What Was Applied

- Team users receive broad development permissions for common practice services such as EC2, ECS, ECR, S3, RDS, DynamoDB, CloudWatch, SSM, and Secrets Manager.
- The policy no longer uses tags as a hard authorization boundary for normal resource creation.
- Explicit deny rules block likely cost-bomb resources and services, including large EC2/RDS, NAT Gateway, Elastic IP allocation, expensive analytics/ML/search services, RDS clusters, public RDS, Multi-AZ RDS, and non-S3/DynamoDB VPC endpoints.
- CI/CD uses a separate GitHub OIDC role that can push ECR images and create/update ECS services while only passing `nammanmu-*` roles.
- The architecture diagram shows the relaxed model as a single AWS practice layout: GitHub Actions OIDC, ECR image push, ECS Fargate service update, ALB ingress, private subnets, RDS, S3/DynamoDB gateway endpoints, CloudWatch Logs, and cost tracking.

## Why It Matters

- The previous tag-enforced sandbox was safer but too restrictive for console-based practice workflows.
- This relaxed model lets users build more naturally while preserving guardrails around expensive resources.
- Tags are still useful for cost tracking, but they are treated as an operational convention instead of a mandatory IAM condition.

## Verification

- `Get-Content -Raw <policy>.json | ConvertFrom-Json`: all relaxed JSON policies parse successfully.
- Minified policy sizes were checked and are below the 6,144-character customer managed policy size limit.
- `[xml](Get-Content -Raw nammanmu-relaxed-cicd-aws-architecture.drawio)`: draw.io XML parses successfully.
- Notion page created for the relaxed policy summary and JSON policy reference.

## Pitfalls And Follow-Ups

- IAM user-level billing separation is not native in AWS; use Cost Allocation Tags, Cost Explorer, Budgets, CloudTrail, and resource inventories together.
- If users do not tag resources voluntarily, cost attribution by owner will be incomplete.
- Administrator-created shared resources such as ALB, NAT Gateway, and production-like RDS should be named and tagged clearly.
- Budget actions can apply IAM policies or target EC2/RDS, but finer tag-based cleanup requires custom automation.
