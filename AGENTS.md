# AGENTS.md

## Prompt Logging And Work Summary Rule

Apply this rule on every user prompt in this repository.

1. Before saving the user's prompt text anywhere, explicitly ask whether the user wants that prompt saved.
2. Do not persist the prompt text unless the user clearly approves.
3. If the user approves prompt saving, write or append a record under `docs/prompt-history/`.
4. Prompt history entries must be useful for later review. Each saved prompt entry should include:
   - prompt text
   - consent text
   - work summary
   - applied files
   - verification commands and outcomes
   - related docs or commits when available
5. If the user declines prompt saving, do not save the prompt text. You may still summarize completed code changes in normal task documentation when the user asked for documentation.
6. For implementation tasks, keep a detailed human-readable work summary in `docs/work-logs/` when the user asks to document the work. Include:
   - request date and time when known
   - objective
   - changed files
   - key implementation decisions
   - verification commands and outcomes
   - remaining issues or follow-up work
7. When writing or changing important code, also create or update a concept note under `docs/concepts/`. Explain:
   - which concept or pattern was applied
   - why it was used in this project
   - which files demonstrate it
   - how to verify or observe the behavior
   - common pitfalls or follow-up improvements
8. If a task includes backend/frontend integration, document the API contract, frontend call path, run commands, and verification results.
9. Keep `docs/prompt-history/` as a prompt-index and summary layer. Keep detailed technical narratives in `docs/work-logs/`. Keep code concept explanations in `docs/concepts/`.

Default question to ask before saving a prompt:

```text
이번 프롬프트 원문을 `docs/prompt-history/`에 저장할까요?
```

Default prompt-history entry structure:

````markdown
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

- 실제 수행한 작업 요약

### Applied Files

- `path/to/file`

### Verification

- `command`: outcome

### Related Docs

- `path/to/doc`
````

Default concept note structure:

```markdown
# Concept Name

## Where It Appears

- `path/to/file`

## What Was Applied

- Explain the core concept in project-specific terms.

## Why It Matters

- Explain why this implementation uses the concept.

## Verification

- `command`: outcome

## Pitfalls And Follow-Ups

- Note risks, limitations, or next steps.
```

Use this rule as a project-level substitute for an interactive prompt-saving hook. A command hook can enforce or remind, but it cannot replace explicit user consent inside the conversation.
