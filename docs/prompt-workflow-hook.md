# Prompt Save And Work Summary Hook

## 목적

이 문서는 다음 요구를 지속적으로 적용하기 위한 기준이다.

- 사용자가 프롬프트를 작성할 때마다 프롬프트 원문 저장 여부를 확인한다.
- 사용자가 승인한 경우에만 프롬프트 원문을 저장한다.
- 구현 작업 중 수행한 내용은 별도 문서에서 다시 볼 수 있게 정리한다.
- 백엔드와 프론트엔드 연동 작업은 API 계약, 프론트 호출 경로, 실행 방법, 검증 결과까지 남긴다.

## 현재 적용 방식

프로젝트 루트의 `AGENTS.md`에 지속 지침을 추가했다. Codex는 새 세션을 시작할 때 프로젝트의 `AGENTS.md`를 읽고, 이 저장소에서 작업할 때 해당 지침을 따른다.

현재 방식은 실제 명령 훅보다 안전하다. 프롬프트 원문 저장은 사용자의 명시적 동의가 필요한 작업이므로, 자동 스크립트가 바로 저장하지 않고 대화 안에서 먼저 물어보도록 지침화했다.

## 매 프롬프트 처리 규칙

1. 사용자의 새 요청을 받는다.
2. 프롬프트 원문을 저장해야 하는 상황이면 먼저 묻는다.

```text
이번 프롬프트 원문을 `docs/prompt-history/`에 저장할까요?
```

3. 사용자가 승인하면 `docs/prompt-history/YYYY-MM-DD.md`에 프롬프트 원문을 저장한다.
4. 사용자가 거절하거나 답하지 않으면 프롬프트 원문은 저장하지 않는다.
5. 구현 작업 정리가 필요하면 `docs/work-logs/YYYY-MM-DD-작업명.md`에 기술 작업 내역을 정리한다.

## 권장 저장 형식

### Prompt History

```markdown
# Prompt History - YYYY-MM-DD

## HH:mm

### Prompt

사용자가 저장을 승인한 프롬프트 원문

### Consent

- Saved with explicit user approval.
```

### Work Log

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
