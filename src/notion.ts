/**
 * Notion API 모듈
 *
 * /content, /money 응답을 각각 Notion DB에 자동 저장.
 * Notion API v1: https://api.notion.com/v1
 */

const NOTION_VERSION = '2022-06-28';

interface NotionPage {
  parent: { database_id: string };
  properties: Record<string, unknown>;
  children?: object[];
}

async function createPage(token: string, page: NotionPage): Promise<void> {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify(page),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API 실패: ${text}`);
  }
}

/** /content 응답을 콘텐츠 DB에 저장 */
export async function saveContentToNotion(
  token: string,
  dbId: string,
  request: string,
  claudeText: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  // 제목: 입력의 첫 30자
  const title = request.length > 30 ? request.slice(0, 30) + '…' : request;

  await createPage(token, {
    parent: { database_id: dbId },
    properties: {
      Name: { title: [{ text: { content: title } }] },
      날짜: { date: { start: today } },
      요청: { rich_text: [{ text: { content: request } }] },
      상태: { select: { name: '초안' } },
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: claudeText.slice(0, 2000) } }],
        },
      },
    ],
  });
}

/** /kim 회고 응답을 회고 DB에 저장 */
export async function saveReviewToNotion(
  token: string,
  dbId: string,
  request: string,
  claudeText: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const title = request.length > 30 ? request.slice(0, 30) + '…' : request;

  await createPage(token, {
    parent: { database_id: dbId },
    properties: {
      Name: { title: [{ text: { content: title } }] },
      날짜: { date: { start: today } },
      유형: { select: { name: '일일회고' } },
      요청: { rich_text: [{ text: { content: request } }] },
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: claudeText.slice(0, 2000) } }],
        },
      },
    ],
  });
}

/** /money 응답을 재무 DB에 저장 */
export async function saveMoneyToNotion(
  token: string,
  dbId: string,
  request: string,
  claudeText: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const title = request.length > 30 ? request.slice(0, 30) + '…' : request;

  // 수익/지출 구분
  const category = request.startsWith('수익') ? '수익' : request.startsWith('지출') ? '지출' : '기타';

  await createPage(token, {
    parent: { database_id: dbId },
    properties: {
      Name: { title: [{ text: { content: title } }] },
      날짜: { date: { start: today } },
      카테고리: { select: { name: category } },
      메모: { rich_text: [{ text: { content: request } }] },
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: claudeText.slice(0, 2000) } }],
        },
      },
    ],
  });
}
