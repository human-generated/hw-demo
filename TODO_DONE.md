# hw-demo DONE

_Items moved here when fully implemented and verified._

## 2026-03-21

### 1. Worker generation — richer workflows ✓
- [x] Each worker must have **≥3 workflows** — generation contract updated
- [x] Each workflow must have **≥5 steps** — contract requires 5-6 domain-specific steps
- [x] Steps mirror real human work: open → fetch → analyse → condition-check → draft → take-action → log → notify
- [x] More varied skills: query-platform, condition, transform-data, generate-report, call-webhook, run-script, send-notification, wait
- [x] Step descriptions are domain-specific with actual SQL/table names
- [x] Claude generation prompt updated
- [x] Fallback workers updated: BI Analyst / Intelligence Analyst / Integration Engineer, each with 3 workflows × 5-6 steps

### 2. Workflow check phase ✓
- [x] New phase `workflow-check` inserted between propose and workers-proposed
- [x] Server: `runWorkflowCheck()` soft-runs all workflows, flags steps with status=error
- [x] Failing workflows regenerated via Claude (max 1 retry)
- [x] SSE events: `phase:workflow-check`, `worker:workflow-check-start`, `worker:workflow-check-done`, `worker:workflow-check-fail`, `worker:workflow-check-pass`, `worker:workflow-check-regenerated`
- [x] Frontend: workflow-check spinner with per-worker status (checking… / passed)
- [x] Frontend polls session every 3s until phase transitions to `workers`

### 3. FlowPanel RUN button = hard run ✓
- [x] `mode: 'soft'` changed to `mode: 'hard'` in FlowPanel.handleRun
- [x] Workflow selector: clicking a workflow card highlights it (SELECTED label, outline)
- [x] Step progress animates during hard run (running → done per step)
- [x] Selected workflow id passed in request

### 4. Telegram group/topic per demo ✓
- [x] `createTelegramSessionLink` now tries `createForumTopic` first
- [x] `session.telegramThreadId` stored when forum topic created
- [x] `doTelegram()` accepts and forwards `threadId` → `message_thread_id`
- [x] Falls back to invite link if forum topics not supported
- [x] Session creation passes `companyName` to `createTelegramSessionLink`
