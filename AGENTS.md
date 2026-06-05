# AGENTS.md

## Prompt Logging And Work Summary Rule

Apply this rule on every user prompt in this repository.

1. Before saving the user's prompt text anywhere, explicitly ask whether the user wants that prompt saved.
2. Do not persist the prompt text unless the user clearly approves.
3. If the user approves prompt saving, write or append a record under `docs/prompt-history/`.
4. If the user declines prompt saving, do not save the prompt text. You may still summarize completed code changes in normal task documentation when the user asked for documentation.
5. For implementation tasks, keep a human-readable work summary in `docs/work-logs/` when the user asks to document the work. Include:
   - request date and time when known
   - objective
   - changed files
   - key implementation decisions
   - verification commands and outcomes
   - remaining issues or follow-up work
6. If a task includes backend/frontend integration, document the API contract, frontend call path, run commands, and verification results.
7. Keep prompt-history entries separate from work-log entries so private prompt text can be omitted without losing the technical change history.

Default question to ask before saving a prompt:

```text
이번 프롬프트 원문을 `docs/prompt-history/`에 저장할까요?
```

Use this rule as a project-level substitute for an interactive prompt-saving hook. A command hook can enforce or remind, but it cannot replace explicit user consent inside the conversation.
