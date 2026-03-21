# hw-demo TODO

## 1. Worker generation — richer workflows
- [ ] Each worker must have **≥3 workflows** (currently generating 2)
- [ ] Each workflow must have **≥5 steps** (currently 3-4)
- [ ] Steps must mirror a real human doing a job: open → fetch → analyse → condition-check → draft → take-action → log → notify
- [ ] More varied skills per workflow (not just query→report→notify)
- [ ] Step descriptions must be domain-specific and company-specific, not generic
- [ ] Update both the Claude generation prompt AND the rich fallback workers
- [ ] Fallback workers need 3 workflows × 5 steps each (not "Monitor/Digest/Sync" generics)

## 2. Workflow check phase (new phase: 'workflow-check')
- [ ] After workers are proposed, add a `workflow-check` phase before `workers`
- [ ] For every worker, soft-run each workflow automatically
- [ ] If any step returns status=error or output is nonsensical → flag as failed
- [ ] On failure: regenerate that specific workflow with Claude (max 2 retries)
- [ ] Fire SSE events: `phase:workflow-check`, `worker:workflow-check-start`, `worker:workflow-check-done`
- [ ] Only advance to phase `workers` once all workflow checks pass
- [ ] Add frontend indicator for workflow-check phase in Workspace/AIWorkers

## 3. FlowPanel RUN button = hard run
- [ ] Change `mode: 'soft'` → `mode: 'hard'` in FlowPanel.handleRun
- [ ] Add workflow selector in FlowPanel so user picks which workflow to hard-run
- [ ] Show which workflow is selected (highlight in the list)
- [ ] Pass selected workflow id in the request
- [ ] Show real-time step progress after clicking RUN

## 4. Telegram group/topic per demo
- [ ] On session creation: call `createForumTopic` in the main supergroup to create a per-session thread
- [ ] Store `session.telegramThreadId` (message_thread_id returned by API)
- [ ] All worker `send-notification` steps must include `message_thread_id` in Telegram calls
- [ ] `doTelegram` helper must accept and forward `threadId`
- [ ] Existing `createTelegramSessionLink` should also announce into the new thread
- [ ] If forum topics not supported (group not a forum), fall back to existing invite-link approach

## 5. More complex generated platforms
- [ ] (Deferred — focus on workflows first per user request)
