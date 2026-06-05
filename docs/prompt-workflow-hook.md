# Prompt Save And Work Summary Hook

## 목적

이 문서는 프롬프트 원문 저장과 작업 요약 기록을 지속적으로 적용하기 위한 기준이다.

- 사용자가 프롬프트를 작성할 때마다 프롬프트 원문 저장 여부를 확인한다.
- 사용자가 승인한 경우에만 프롬프트 원문을 저장한다.
- 저장된 프롬프트 기록에는 실제 수행 작업, 적용 파일, 검증 결과도 함께 남긴다.
- 긴 기술 설명은 `docs/work-logs/`에 남기고, `docs/prompt-history/`는 프롬프트별 인덱스와 요약 역할을 맡는다.
- 중요한 코드 개념과 패턴 설명은 `docs/concepts/`에 별도로 남긴다.

## 현재 적용 방식

프로젝트 루트의 `AGENTS.md`에 지속 지침을 둔다. Codex는 새 세션을 시작할 때 프로젝트의 `AGENTS.md`를 읽고, 이 저장소에서 작업할 때 해당 지침을 따른다.

프롬프트 원문 저장은 사용자의 명시적 동의가 필요한 작업이다. 따라서 자동 스크립트가 바로 저장하지 않고, 대화 안에서 먼저 물어본 뒤 승인된 경우에만 저장한다.

## 매 프롬프트 처리 규칙

1. 사용자의 새 요청을 받는다.
2. 요청을 처리한다.
3. 프롬프트 원문 저장 여부를 묻는다.

```text
이번 프롬프트 원문을 `docs/prompt-history/`에 저장할까요?
```

4. 사용자가 승인하면 `docs/prompt-history/YYYY-MM-DD.md`에 기록한다.
5. 사용자가 거절하거나 답하지 않으면 프롬프트 원문은 저장하지 않는다.
6. 구현 작업 정리가 필요하면 `docs/work-logs/YYYY-MM-DD-작업명.md`에 자세한 기술 작업 로그를 별도로 남긴다.
7. 중요한 코드 개념이 적용되었으면 `docs/concepts/개념명.md`에 개념 설명을 남긴다.

## Prompt History 형식

````markdown
# Prompt History - YYYY-MM-DD

## HH:mm:ss

### Prompt

```text
사용자가 저장을 승인한 프롬프트 원문
```

### Consent

```text
사용자의 저장 승인 응답
```

### Work Summary

- 실제 수행한 작업을 2-5개 bullet로 요약한다.
- 작업이 문서 변경뿐인지, 코드 변경까지 포함했는지 명확히 적는다.

### Applied Files

- `path/to/changed-file`

### Verification

- `command`: 통과/실패/미실행 사유

### Related Docs

- `docs/work-logs/...`
- `docs/README.md`
````

## Work Log 형식

```markdown
# 작업명 Work Log

## 목표

작업 목표 요약

## 변경 파일

- `path/to/file`

## 구현 내용

- 주요 구현 내용

## 검증

- 실행한 명령
- 결과

## 남은 작업

- 남은 이슈 또는 후속 작업
```

## Concept Note 형식

```markdown
# Concept Name

## Where It Appears

- `path/to/file`

## What Was Applied

- 프로젝트 코드에 적용된 핵심 개념을 설명한다.

## Why It Matters

- 이 개념을 사용한 이유와 대안을 설명한다.

## Verification

- `command`: 결과

## Pitfalls And Follow-Ups

- 주의사항과 후속 개선점을 정리한다.
```

## 실제 Codex Hook으로 확장할 때

Codex의 `UserPromptSubmit` 훅은 매 사용자 프롬프트 제출 시 실행할 수 있다. 다만 훅은 명령 스크립트 실행용이므로, 대화형 동의 확인을 완전히 대체하기보다 "저장 여부 확인을 잊지 말라"는 알림 또는 검증 용도로 사용하는 것이 적절하다.

예시 위치:

```text
.codex/hooks.json
.codex/hooks/user_prompt_submit_reminder.ps1
```

예시 설정:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "commandWindows": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"$(git rev-parse --show-toplevel)\\.codex\\hooks\\user_prompt_submit_reminder.ps1\"",
            "timeout": 10,
            "statusMessage": "Checking prompt save reminder"
          }
        ]
      }
    ]
  }
}
```

주의:

- 새 훅이나 변경된 훅은 Codex에서 신뢰 검토가 필요하다.
- 프로젝트 로컬 훅은 프로젝트 `.codex/` 계층이 trusted 상태일 때 동작한다.
- 프롬프트 원문 저장은 자동 저장보다 사용자 승인 후 저장 방식을 유지한다.
