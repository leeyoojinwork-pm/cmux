/**
 * Slack Block Kit 응답 포맷 모듈
 *
 * Slack Block Kit: https://api.slack.com/block-kit
 * 구조:
 *   [헤더 섹션] skill_view / agent / request 메타 정보
 *   [구분선]
 *   [본문 섹션] Claude 응답 텍스트
 *   [컨텍스트] 응답 생성 시각 (KST)
 */

/**
 * Claude 응답을 실행 로그 스타일의 Slack Block Kit 페이로드로 변환.
 *
 * response_type: "in_channel" → 채널 전체에 표시
 * response_type: "ephemeral" → 요청자에게만 표시
 *
 * @param request    - 사용자 원본 입력 텍스트
 * @param claudeText - Claude가 생성한 응답 텍스트
 * @returns Slack API가 수신하는 Block Kit 페이로드 객체
 */
export function formatResponse(request: string, claudeText: string, agent?: { name: string; emoji: string; skillView: string }): object {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const agentName = agent?.name ?? '대표 AI';
  const agentEmoji = agent?.emoji ?? '👔';
  const skillView = agent?.skillView ?? 'ceo-ops';

  // Slack 섹션 블록은 3000자 제한 — 긴 응답은 분할
  const chunks = splitText(claudeText, 2800);

  return {
    response_type: 'in_channel',
    blocks: [
      // 헤더
      {
        type: 'header',
        text: { type: 'plain_text', text: `${agentEmoji} ${agentName}` },
      },
      // 메타 정보
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `\`${skillView}\`  •  💬 ${request}` },
        ],
      },
      { type: 'divider' },
      // 본문 (분할된 청크)
      ...chunks.map((chunk) => ({
        type: 'section',
        text: { type: 'mrkdwn', text: chunk },
      })),
      { type: 'divider' },
      // 푸터
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `🕐 ${now}  •  AI 유진 OS` }],
      },
    ],
  };
}

// 긴 텍스트를 maxLen 단위로 분할 (단어 경계 기준)
function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('\n', maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
