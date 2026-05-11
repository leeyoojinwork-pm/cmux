/**
 * smux — Slack AI 운영팀 Worker
 *
 * 흐름: Slack /kim 명령어 → 서명 검증 → Claude API 호출 → Slack 응답
 *
 * Slack Slash Command는 3초 안에 HTTP 200을 받지 못하면 timeout 처리.
 * Claude API 응답은 3초를 초과할 수 있으므로:
 *   1. 요청 수신 즉시 200 + "처리 중..." 반환
 *   2. ctx.waitUntil()로 백그라운드에서 Claude 호출 후 response_url로 전송
 */

import { verifySlackSignature } from './slack';
import { callClaude } from './claude';
import { formatResponse } from './format';
import { getAgent } from './agents';
import { getTodayEvents, formatCalendarBlocks } from './calendar';
import { saveContentToNotion, saveMoneyToNotion, saveReviewToNotion } from './notion';
import { D1Database, saveHistory, getRecentHistory } from './history';
import { DASHBOARD_HTML } from './dashboard';

/** Cloudflare Workers 환경변수 타입 정의 */
export interface Env {
  SLACK_SIGNING_SECRET: string;       // Slack App > Basic Information > Signing Secret
  SLACK_BOT_TOKEN: string;            // Slack App > OAuth & Permissions > Bot User OAuth Token
  ANTHROPIC_API_KEY: string;          // console.anthropic.com > API Keys
  GOOGLE_CLIENT_ID: string;           // Google Cloud Console > OAuth 2.0 클라이언트 ID
  GOOGLE_CLIENT_SECRET: string;       // Google Cloud Console > OAuth 2.0 클라이언트 보안 비밀
  GOOGLE_REFRESH_TOKEN: string;       // OAuth 인증 후 발급된 refresh_token
  DAILY_SCHEDULE_CHANNEL: string;     // #01-오늘일정 채널 ID (예: C0B2XXXXXX)
  NOTION_TOKEN: string;               // Notion Integration 토큰
  NOTION_CONTENT_DB: string;          // 콘텐츠 DB ID
  NOTION_MONEY_DB: string;            // 재무 DB ID
  NOTION_REVIEW_DB: string;           // 회고 DB ID (/kim 회고: 자동 저장)
  DB: D1Database;                     // Cloudflare D1 — 봇 응답 히스토리
}

export default {
  // Cron 트리거 핸들러
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const hour = new Date().getUTCHours();
    const day = new Date().getUTCDay(); // 0=일, 5=금

    if (hour === 0) {
      // KST 09:00 — 아침 브리핑 + 오늘 일정
      ctx.waitUntil(sendCronMessage(
        '🌅 *좋은 아침이에요!*\n\n오늘 하루를 시작해볼까요?\n\n`/kim 오늘 할 일: [내용 입력]` 으로 우선순위를 잡아보세요.',
        env.SLACK_BOT_TOKEN
      ));
      ctx.waitUntil(postTodaySchedule(env));
    } else if (hour === 9) {
      // KST 18:00 — 회고 리마인더
      ctx.waitUntil(sendCronMessage(
        '🌆 *하루 마무리 시간이에요.*\n\n`/kim 회고: [오늘 한 일]` 로 오늘을 정리해보세요.',
        env.SLACK_BOT_TOKEN
      ));
    } else if (hour === 8 && day === 5) {
      // KST 금 17:00 — 주간 자동 회고
      ctx.waitUntil(postWeeklyReport(env));
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // GET /dashboard — 관리 대시보드
    if (request.method === 'GET' && url.pathname === '/dashboard') {
      return new Response(DASHBOARD_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // GET / — 간단한 안내
    if (request.method === 'GET') {
      return new Response('smux — AI 운영팀 Worker\n\nGET /dashboard 로 대시보드를 확인하세요.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const body = await request.text();
    const contentType = request.headers.get('Content-Type') || '';

    // Slack Events API (JSON) — URL 검증 챌린지 + DM 메시지 이벤트
    if (contentType.includes('application/json')) {
      const isValid = await verifySlackSignature(request.headers, body, env.SLACK_SIGNING_SECRET);
      if (!isValid) return new Response('Unauthorized', { status: 401 });

      const event = JSON.parse(body);

      // Slack URL 검증 (이벤트 등록 시 한 번 호출)
      if (event.type === 'url_verification') {
        return new Response(JSON.stringify({ challenge: event.challenge }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // DM 메시지 이벤트 처리 (봇 자신의 메시지는 무시)
      if (event.event?.type === 'message' && !event.event.bot_id && event.event.channel_type === 'im') {
        ctx.waitUntil(handleDM(event.event.text, event.event.channel, env));
      }

      // 채널 멘션 처리 — @김이사 [텍스트]
      if (event.event?.type === 'app_mention' && !event.event.bot_id) {
        // <@BOTID> 부분 제거 후 텍스트만 추출
        const mentionText = (event.event.text as string).replace(/<@[A-Z0-9]+>/g, '').trim();
        ctx.waitUntil(handleDM(mentionText, event.event.channel, env));
      }

      return new Response('OK', { status: 200 });
    }

    // Slack Slash Command (application/x-www-form-urlencoded)
    const isValid = await verifySlackSignature(request.headers, body, env.SLACK_SIGNING_SECRET);
    if (!isValid) return new Response('Unauthorized', { status: 401 });

    const params = new URLSearchParams(body);
    const text = params.get('text') || '';
    const command = params.get('command') || '/kim';
    const responseUrl = params.get('response_url') || '';
    const userId = params.get('user_id') || '';
    const userName = params.get('user_name') || '';

    if (!responseUrl) return new Response('Bad Request', { status: 400 });

    // /help — 사용법 즉시 반환 (Claude 호출 불필요)
    if (command === '/help') {
      return new Response(JSON.stringify(helpPayload()), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // /log — 메모 없이 단독 사용 시 최근 히스토리 조회, 텍스트 있으면 로그 기록
    if (command === '/log') {
      if (!text && env.DB) {
        ctx.waitUntil(sendHistoryEphemeral(responseUrl, env.DB));
        return new Response(JSON.stringify({ response_type: 'ephemeral', text: '⏳ 히스토리 불러오는 중...' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      ctx.waitUntil(postLog(text, env.SLACK_BOT_TOKEN));
      return new Response(JSON.stringify({ response_type: 'ephemeral', text: '✅ 시스템로그에 기록됐어요.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ctx.waitUntil(handleCommand(text, command, responseUrl, userId, userName, env));

    return new Response(JSON.stringify({ response_type: 'ephemeral', text: '⏳ 처리 중...' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

/**
 * Claude API를 호출하고 결과를 Slack response_url로 전송.
 * 오류 발생 시 사용자에게 ephemeral 메시지로 알림.
 */
async function handleCommand(
  text: string,
  command: string,
  responseUrl: string,
  userId: string,
  userName: string,
  env: Env
): Promise<void> {
  try {
    const agent = getAgent(command);
    const claudeText = await callClaude(text, env.ANTHROPIC_API_KEY, agent.systemPrompt);
    const payload = formatResponse(text, claudeText, agent);
    await sendDelayedResponse(responseUrl, payload);

    // D1 히스토리 저장
    if (env.DB) {
      await saveHistory(env.DB, command, userId, userName, text, claudeText).catch(() => null);
    }

    // 채널 미러링 — /kim 제외, 각 에이전트 채널에 응답 자동 포스팅
    if (command !== '/kim' && agent.channel) {
      await mirrorToChannel(agent, text, claudeText, userName, env.SLACK_BOT_TOKEN).catch(() => null);
    }

    // /content → Notion 콘텐츠 DB 저장
    if (command === '/content' && env.NOTION_TOKEN && env.NOTION_CONTENT_DB) {
      await saveContentToNotion(env.NOTION_TOKEN, env.NOTION_CONTENT_DB, text, claudeText).catch(() => null);
    }

    // /money → Notion 재무 DB 저장
    if (command === '/money' && env.NOTION_TOKEN && env.NOTION_MONEY_DB) {
      await saveMoneyToNotion(env.NOTION_TOKEN, env.NOTION_MONEY_DB, text, claudeText).catch(() => null);
    }

    // /kim 회고: → Notion 회고 DB 저장
    if (command === '/kim' && env.NOTION_TOKEN && env.NOTION_REVIEW_DB && text.startsWith('회고:')) {
      await saveReviewToNotion(env.NOTION_TOKEN, env.NOTION_REVIEW_DB, text, claudeText).catch(() => null);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    await sendDelayedResponse(responseUrl, {
      response_type: 'ephemeral',
      text: `❌ 오류: ${message}`,
    });
  }
}

/**
 * Slack response_url로 지연 응답 전송.
 * response_url은 최대 5회, 30분 이내에만 사용 가능.
 */
async function sendDelayedResponse(responseUrl: string, payload: object): Promise<void> {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function helpPayload(): object {
  return {
    response_type: 'ephemeral',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🤖 AI 유진 OS — 사용법 안내' } },
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: '*👔 /kim* — 대표 AI\n오늘 할 일 정리, 우선순위 결정, 회고\n예: `/kim 오늘 할 일: 콘텐츠 발행, 강의 피드백`' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*✍️ /content* — 콘텐츠 AI\n블로그 초안, 스레드 초안, 릴스 대본, 후기형 글\n예: `/content 블로그 초안: [맛집명] 방문 후기`' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*💼 /job* — 취준 AI\nJD 분석, 이력서 피드백, 면접 질문\n예: `/job JD 분석: [JD 내용 붙여넣기]`' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*📚 /lecture* — 강의 AI\n피드백 생성, 공지 초안, PDF 문구\n예: `/lecture 공지 초안: 3주차 zoom 링크 변경`' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*💰 /money* — 재무 AI\n수익 기록, 지출 체크, 월간 리포트\n예: `/money 수익 기록: 500000 멋사 강의료`' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*🔍 /think* — PM 분석 AI\n문제 5Why 분석, 임팩트×실현가능성 4분면, 30분 검증 액션\n예: `/think 문제 분석: 수강생 이탈이 3주차에 집중됨`' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*📋 /brief* — 기획 AI\n아이디어 → 1페이지 기획서 즉시 생성, 기능 명세, PRD 초안\n예: `/brief 기획서: 강의 피드백 자동화 도구`' } },
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: '*⚙️ /log [메모]* — 시스템로그에 기록\n*❓ /help* — 이 도움말 보기' } },
    ],
  };
}

async function sendCronMessage(text: string, botToken: string): Promise<void> {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${botToken}` },
    body: JSON.stringify({ channel: 'C0B2E4SQUSX', text }),
  });
}

/** 금요일 17시 — D1 히스토리 기반 주간 자동 회고 */
async function postWeeklyReport(env: Env): Promise<void> {
  try {
    // 최근 50건 히스토리 조회
    const rows = env.DB ? await getRecentHistory(env.DB, 50) : [];

    // 커맨드별 사용 횟수 집계
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.command] = (counts[r.command] ?? 0) + 1;
    }
    const statsLines = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cmd, n]) => `  • ${cmd}: ${n}회`)
      .join('\n');

    // 요청 목록 요약용 텍스트
    const requestSummary = rows
      .slice(0, 20)
      .map(r => `[${r.command}] ${r.request.slice(0, 60)}`)
      .join('\n');

    // Claude로 주간 회고 생성
    const agent = getAgent('/kim');
    const prompt = `이번 주 AI 운영팀 사용 기록이야. 주간 회고를 작성해줘.

사용 통계:
${statsLines || '기록 없음'}

주요 요청 목록:
${requestSummary || '기록 없음'}

형식: [이번 주 총평 2줄] + [잘한 것 2개] + [다음 주 핵심 액션 3개] + [한 줄 격려]`;

    const claudeText = await callClaude(prompt, env.ANTHROPIC_API_KEY, agent.systemPrompt);

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}` },
      body: JSON.stringify({
        channel: 'C0B2E4SQUSX',
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '📊 이번 주 AI 운영팀 주간 회고' } },
          { type: 'divider' },
          ...(statsLines ? [{
            type: 'section',
            text: { type: 'mrkdwn', text: `*이번 주 사용 현황*\n${statsLines}` },
          }] : []),
          { type: 'section', text: { type: 'mrkdwn', text: claudeText } },
          { type: 'divider' },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `자동 생성 — AI 유진 OS` }] },
        ],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    await sendCronMessage(`❌ 주간 회고 생성 실패: ${message}`, env.SLACK_BOT_TOKEN);
  }
}

/** 에이전트 응답을 해당 채널에 미러링 */
async function mirrorToChannel(
  agent: { name: string; emoji: string; channel: string },
  request: string,
  response: string,
  userName: string,
  botToken: string
): Promise<void> {
  const preview = request.length > 50 ? request.slice(0, 50) + '…' : request;
  const body = response.length > 2800 ? response.slice(0, 2800) + '\n_(이하 생략)_' : response;

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${botToken}` },
    body: JSON.stringify({
      channel: agent.channel,
      blocks: [
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `${agent.emoji} *${agent.name}* — @${userName}의 요청: _"${preview}"_` }],
        },
        { type: 'section', text: { type: 'mrkdwn', text: body } },
        { type: 'divider' },
      ],
    }),
  });
}

/** /log 단독 사용 시 최근 10건 히스토리를 ephemeral로 반환 */
async function sendHistoryEphemeral(responseUrl: string, db: D1Database): Promise<void> {
  const rows = await getRecentHistory(db, 10);
  if (rows.length === 0) {
    await sendDelayedResponse(responseUrl, { response_type: 'ephemeral', text: '아직 히스토리가 없어요.' });
    return;
  }
  const lines = rows.map(r =>
    `*${r.command}* — ${r.user_name}  \`${r.created_at}\`\n> ${r.request.slice(0, 60)}${r.request.length > 60 ? '…' : ''}`
  );
  await sendDelayedResponse(responseUrl, {
    response_type: 'ephemeral',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🗂️ 최근 봇 사용 히스토리 (10건)' } },
      { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n\n') } },
    ],
  });
}

async function postLog(text: string, botToken: string): Promise<void> {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${botToken}` },
    body: JSON.stringify({ channel: 'C0B2Q49PS76', text: `📝 *[수동 로그]* ${now}\n${text}` }),
  });
}

/** Google Calendar 오늘 일정을 #01-오늘일정 채널에 전송 */
async function postTodaySchedule(env: Env): Promise<void> {
  try {
    const events = await getTodayEvents(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REFRESH_TOKEN
    );
    const payload = formatCalendarBlocks(events);
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}` },
      body: JSON.stringify({ channel: env.DAILY_SCHEDULE_CHANNEL, ...payload }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}` },
      body: JSON.stringify({ channel: env.DAILY_SCHEDULE_CHANNEL, text: `❌ 일정 조회 실패: ${message}` }),
    });
  }
}

// DM 메시지에 대한 응답 — 대표 AI(/kim) 페르소나로 처리
async function handleDM(text: string, channelId: string, env: Env): Promise<void> {
  try {
    const agent = getAgent('/kim');
    const claudeText = await callClaude(text, env.ANTHROPIC_API_KEY, agent.systemPrompt);
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({ channel: channelId, text: claudeText }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({ channel: channelId, text: `❌ 오류: ${message}` }),
    });
  }
}
