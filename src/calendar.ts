/**
 * Google Calendar API 모듈
 *
 * OAuth2 refresh_token으로 access_token 갱신 후 오늘 일정 조회.
 * Cloudflare Workers는 fetch API만 사용 가능 (google-auth-library 불가).
 */

export interface CalendarEvent {
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

/** refresh_token으로 access_token 획득 */
async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth 실패: ${text}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/** 오늘 KST 기준 일정 조회 (전체 캘린더) */
export async function getTodayEvents(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<CalendarEvent[]> {
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

  // KST 오늘 00:00 ~ 23:59 (UTC+9 기준)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstToday = new Date(kstNow.toISOString().slice(0, 10) + 'T00:00:00+09:00');
  const kstTomorrow = new Date(kstToday.getTime() + 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: kstToday.toISOString(),
    timeMax: kstTomorrow.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '20',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API 실패: ${text}`);
  }

  const data = await res.json() as { items: CalendarEvent[] };
  return data.items ?? [];
}

/** 일정 목록을 Slack Block Kit 페이로드로 변환 */
export function formatCalendarBlocks(events: CalendarEvent[]): object {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const blocks: object[] = [
    { type: 'header', text: { type: 'plain_text', text: `📅 오늘 일정 — ${today}` } },
    { type: 'divider' },
  ];

  if (events.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '오늘 예정된 일정이 없어요. 집중 작업하기 좋은 날이에요! 💪' },
    });
  } else {
    for (const event of events) {
      const timeStr = formatEventTime(event);
      const title = event.summary ?? '(제목 없음)';
      let text = `*${title}*  ${timeStr}`;
      if (event.location) text += `\n📍 ${event.location}`;

      blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
    }
  }

  blocks.push(
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `🕐 ${now}  •  AI 유진 OS` }] }
  );

  return { blocks };
}

function formatEventTime(event: CalendarEvent): string {
  const start = event.start.dateTime ?? event.start.date;
  const end = event.end.dateTime ?? event.end.date;

  if (!start) return '';

  // 종일 이벤트
  if (!event.start.dateTime) return '종일';

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
    });

  return end ? `${fmt(start)} ~ ${fmt(end)}` : fmt(start);
}
