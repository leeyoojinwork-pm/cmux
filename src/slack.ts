/**
 * Slack 요청 서명 검증 (HMAC-SHA256)
 *
 * Slack은 모든 요청에 X-Slack-Signature 헤더를 포함해 보냄.
 * 서명 검증 없이 처리하면 외부에서 위조 요청을 보낼 수 있으므로 필수.
 *
 * 검증 방식:
 *   sigBase = "v0:{timestamp}:{raw_body}"
 *   expected = "v0=" + HMAC_SHA256(signingSecret, sigBase)
 *   expected === X-Slack-Signature 이면 유효
 *
 * 참고: https://api.slack.com/authentication/verifying-requests-from-slack
 */
export async function verifySlackSignature(
  headers: Headers,
  body: string,
  signingSecret: string
): Promise<boolean> {
  const timestamp = headers.get('X-Slack-Request-Timestamp');
  const slackSignature = headers.get('X-Slack-Signature');

  if (!timestamp || !slackSignature) return false;

  // 리플레이 공격 방지: 현재 시각과 5분 이상 차이나는 요청 거부
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  // Slack 서명 베이스 문자열: "v0:{unix_timestamp}:{raw_body}"
  const sigBase = `v0:${timestamp}:${body}`;

  // Web Crypto API로 HMAC-SHA256 서명 생성 (Node.js crypto 대신 사용 — Workers 호환)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigBase));

  // ArrayBuffer → hex string 변환 후 "v0=" 접두사 추가
  const hashHex = 'v0=' + Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex === slackSignature;
}
