# IAM Tag-Based Sandbox Policies

## Where It Appears

- `NammanmuOwnSandbox.1-read-storage.json`
- `NammanmuOwnSandbox.2-rds-secrets.json`
- `NammanmuOwnSandbox.3-network-create.json`
- `NammanmuOwnSandbox.4-network-manage.json`
- `NammanmuGuardrailDeny.1-core-tag-protection.json`
- `NammanmuGuardrailDeny.2-ec2-vpc-instance-tags.json`
- `NammanmuGuardrailDeny.3-ec2-network-child-tags.json`
- `NammanmuGuardrailDeny.4-service-tags.json`

## What Was Applied

- Team users share one AWS account but are separated with IAM principal tags such as `Owner=gyugo`.
- New resources must be created with `Project=nammanmu`, `Environment=dev`, and `Owner=${aws:PrincipalTag/Owner}`.
- Existing parent resources, such as VPCs used when creating subnets or security groups, are checked with `aws:ResourceTag`.
- Large policies are split into multiple customer managed policies so each one stays under IAM policy size limits.

## Why It Matters

- IAM users are not separate AWS accounts, so `Owner` tags are the practical boundary for team-member cost and resource tracking.
- Tag enforcement enables later automation with Cost Allocation Tags, Cost Explorer or CUR, and Lambda-based stop actions.
- Splitting policies avoids IAM document size limits while keeping permissions readable by responsibility.

## Verification

- `Get-Content -Raw <policy>.json | ConvertFrom-Json`: all split JSON policies parse successfully.
- Minified policy sizes were checked and are below the IAM customer managed policy size limit.

## Pitfalls And Follow-Ups

- Attach no more than 10 managed policies to the IAM group.
- Do not attach the old unsplit `NammanmuOwnSandbox.revised.json`; it was removed after splitting.
- If console wizards create resources without tags, use CloudShell or IaC commands with explicit tag options instead.
- Budget-based automatic stop still needs separate automation using Cost Allocation Tags and a Lambda or similar workflow.
