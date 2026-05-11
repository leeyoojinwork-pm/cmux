/**
 * Anthropic Claude API 호출 모듈
 *
 * 모델: claude-sonnet-4-6 (빠른 응답 + 높은 품질 밸런스)
 * 페르소나: "김이사" — 간결하고 실행 가능한 답변을 주는 AI 운영 어시스턴트
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/** Claude Messages API 응답 타입 (필요한 필드만 정의) */
interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

/**
 * Claude API를 호출하고 첫 번째 텍스트 응답을 반환.
 *
 * @param userText     - 사용자 입력 텍스트
 * @param apiKey       - Anthropic API Key
 * @param systemPrompt - 에이전트별 시스템 프롬프트
 * @returns Claude가 생성한 응답 텍스트
 * @throws API 호출 실패 시 상태코드 포함 에러
 */
export async function callClaude(userText: string, apiKey: string, systemPrompt: string): Promise<string> {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01', // API 버전 고정 (breaking change 방지)
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024, // Slack 메시지 길이 제한 고려 (3000자)
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API ${response.status}: ${error}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  // content 배열의 첫 번째 text 블록 반환 (tool_use 등 다른 타입은 MVP에서 미사용)
  return data.content[0].text;
}
