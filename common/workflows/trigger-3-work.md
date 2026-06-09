# Trigger 3 - `작업` Workflow

## Purpose

Keep the `작업` conversational trigger small, predictable, and reusable across project work. When the user says `작업`, Codex should show a task menu first and wait for the user to choose a number.

## Default Menu

```text
작업 목록
1. 커밋 이력 작성
2. Jira 에픽/이슈 입력 템플릿 작성 및 반영

진행할 번호를 선택해주세요.
```

## 1. 커밋 이력 작성

When the user chooses `1`, prepare a commit-history-oriented summary of the current repository work.

1. Inspect `git status`, recent commits, and relevant diffs.
2. Summarize what changed, which files were affected, and what verification was run or still needs to be run.
3. Suggest a clear commit grouping and commit message.
4. Do not stage, commit, or push unless the user explicitly asks for that follow-up action.

## 2. Jira 에픽/이슈 입력 템플릿 작성 및 반영

When the user chooses `2`, help the user decide and apply which Jira epic should contain which issue, using a user-filled template. Do not infer and immediately apply Jira changes from the backlog alone.

### Required Flow

1. Inspect the accessible Jira project backlog and timeline before asking for input.
2. Show a short context summary:
   - available epics
   - open backlog issues
   - current parent/epic links
   - statuses
   - assignees
   - sprint/backlog placement
   - schedule-related fields when available
3. Present the Jira input template below and ask the user to fill in the desired changes.
4. Explain the available choices for Jira-specific fields before asking for final approval.
5. Preserve the user's `title`, `description`, and `comment` text exactly as written when the user marks them as `그대로 반영`. If the user writes `AI가 추천`, `자동 추천`, or `?`, generate a recommendation from the current Jira context, git history, and repository diff, then show it in the preview.
6. Validate that the requested Jira fields are available in the target project before applying changes.
7. Prepare a preview of the exact Jira changes, including:
   - epic
   - issue type
   - parent relationship
   - sprint/backlog placement
   - status
   - priority
   - assignee
   - dates
   - labels
   - issue links
   - comments
   - worklog entries
8. Apply changes only after the user clearly approves the preview, for example by saying `반영해`, `적용해`, or another clear approval.
9. After changes, report the updated issue keys, their target epics, and anything that still needs manual follow-up.

### Jira Input Template

```text
Jira 작업 입력 템플릿

1. 에픽
- 프로젝트 키: 예) S3M4
- 기존 에픽 키: 예) S3M4-1
- 또는 새 에픽 제목: 새 에픽이 필요할 때 작성
- 선택 기준: 기존 에픽 키가 있으면 그 에픽 아래에 넣고, 새 에픽 제목이 있으면 새 에픽 생성 여부를 미리보기에서 확인한다.

2. 이슈 작업
- 작업 방식: 만들기 / 기존 이슈 이동 / 기존 이슈 수정
- 기존 이슈 키: 이동 또는 수정일 때만 작성
- 이슈 타입: 에픽 / 작업 / 스토리 / 버그 / Subtask
- 제목: 그대로 반영할 문장, 또는 `AI가 추천`
- 설명: 그대로 반영할 본문, 또는 `AI가 추천`

3. Jira 필드
- 담당자: 이름/이메일/account id, 또는 `나`
- 우선순위: Highest / High / Medium / Low / Lowest / `AI가 추천`
- 상태: 기본 생성 상태 / 할 일 / 진행 중 / 완료 / `AI가 추천`
- Sprint 또는 Backlog: Sprint 이름/ID, 또는 Backlog
- 시작일: YYYY-MM-DD, `오늘`, 또는 `AI가 추천`
- 마감일: YYYY-MM-DD, 또는 `AI가 추천`
- Story point estimate:
- 라벨: 쉼표로 구분, 또는 `AI가 추천`
- 관련 이슈 링크: 링크 타입 + 이슈 키. 예) Relates S3M4-1, Blocks S3M4-2
- 댓글: 그대로 반영할 문장, 비워두기, 또는 `AI가 추천`
- 작업 로그: 예) 30m, 1h, 비워두기

4. 하위 작업 또는 체크리스트
- 하위 작업으로 만들 항목:
- 설명에 체크리스트로 넣을 항목:
```

### Supported Choices In S3M4

Known project choices observed in Jira:

- Project key: `S3M4`
- Issue types: `에픽`, `작업`, `스토리`, `버그`, `Subtask`
- Common statuses observed: `할 일`, `진행 중`
- Date fields: `시작 날짜`, `기한`
- Sprint field: `Sprint`; use `Backlog` by leaving Sprint empty
- Link types: `Blocks`, `Duplicate`, `Relates`, `Cloners`
- Assignable current user: `Go Gyu` / `GyuGo` / `gyugo4894@gmail.com`

When a user enters `?`, choose a conservative default and show the reasoning in the preview:

- Priority: use `Medium` unless the task is urgent, blocked, or cleanup-only.
- Status: use the default creation status, usually `할 일`, unless the user says work has already started.
- Sprint or Backlog: keep `Backlog` if the user says Backlog or if timing is not committed.
- Start date: use today's date when the user says today.
- Due date: use the given final date when the user provides a range.
- Labels: infer concise labels from the work, such as `jira`, `workflow`, `docs`, `ai-board`.
- Comments and worklogs: leave empty unless the user provides content or explicitly asks for generated comments/worklogs.
- Checklist: infer 2-5 practical verification or follow-up items from the current git diff and Jira objective.

## Jira Feature Notes

Use Jira features when the user provides values for them and the target project supports them:

- Epic or parent relationship
- Issue type: task, story, bug, subtask, or project-specific equivalents
- Sprint or backlog placement
- Status transition
- Priority
- Assignee
- Start date and due date
- Labels
- Issue links such as relates, blocks, duplicates, or clones
- Comments
- Worklogs

If a requested field is unsupported or ambiguous, explain the limitation and ask for the smallest clarification needed before applying changes.
