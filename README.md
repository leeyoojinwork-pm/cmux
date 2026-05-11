# smux — Slack AI 운영팀 MVP

Slack `/kim` 명령어 → Cloudflare Worker → Claude API → Slack 응답

## 응답 예시

```
📚 skill_view: `daily-briefing`
🧠 agent: `김이사`
💬 request: "오늘 정리해줘"

──────────────────────────

1. 가장 급한 일정 확인
2. 오늘 안에 끝낼 업무 정리
3. 미뤄도 되는 일 분리

🕐 2026. 5. 8. 오전 10:00:00
```

---

## 1. 사전 준비

```bash
npm install
```

Node.js 18+ 및 [Wrangler 설치](https://developers.cloudflare.com/workers/wrangler/install-and-update/) 필요.

---

## 2. 환경변수 설정

로컬 개발용 (`.dev.vars` 파일 생성):

```
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=your_slack_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
```

배포 환경용 (Cloudflare Workers Secret):

```bash
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put SLACK_BOT_TOKEN
wrangler secret put ANTHROPIC_API_KEY
```

---

## 3. 로컬 테스트

```bash
npm run dev
```

Worker가 `http://localhost:8787` 에서 실행됩니다.

외부 노출이 필요하면 ngrok 사용:

```bash
ngrok http 8787
```

ngrok URL을 Slack App의 Slash Command Request URL로 설정:
`https://xxxx.ngrok.io`

### curl로 직접 테스트 (서명 검증 우회용)

로컬에서 빠르게 Claude 연동만 확인하려면 `.dev.vars`의 `SLACK_SIGNING_SECRET`을 `test`로 설정하고:

```bash
# 타임스탬프와 서명을 직접 생성해야 하므로, 아래 스크립트 사용
node test/send.mjs
```

---

## 4. Slack App 설정

1. [api.slack.com/apps](https://api.slack.com/apps) → Create New App
2. **Slash Commands** → Create New Command
   - Command: `/kim`
   - Request URL: `https://smux.<your-subdomain>.workers.dev`
   - Short Description: `AI 운영 어시스턴트 김이사`
3. **OAuth & Permissions** → Bot Token Scopes 추가:
   - `chat:write`
   - `commands`
4. 앱을 워크스페이스에 설치 → Bot Token 복사

---

## 5. 배포

```bash
npm run deploy
```

배포 후 Worker URL이 출력됩니다. 이 URL을 Slack Slash Command Request URL에 등록합니다.

---

## 프로젝트 구조

```
smux/
├── src/
│   ├── index.ts      # Worker 진입점
│   ├── slack.ts      # Slack 서명 검증
│   ├── claude.ts     # Claude API 호출
│   └── format.ts     # Slack 응답 포맷
├── wrangler.toml
├── package.json
├── tsconfig.json
└── README.md
```
