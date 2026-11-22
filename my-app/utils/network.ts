import { Platform } from 'react-native';

// ─── 네트워크 연결 확인 ────────────────────────────────────────────
// 별도 라이브러리 없이, 가볍게 응답만 받아 보는 요청으로 인터넷이 되는지 확인한다.
// 응답 내용·상태 코드는 상관없고, 요청이 상대 서버에 닿기만 하면 연결된 것으로 본다.
const PROBE_URL = 'https://clients3.google.com/generate_204';
const TIMEOUT_MS = 4000;

/** 인터넷에 연결되어 있으면 true. 연결이 없거나 4초 안에 응답이 없으면 false */
export async function isOnline(): Promise<boolean> {
  // 웹 브라우저가 스스로 오프라인이라고 알려 주면 바로 판단
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);
  try {
    // no-cors: 웹에서 CORS 때문에 실패해도 '연결됨'으로 오판하지 않도록 (응답 내용은 읽지 않음)
    await fetch(PROBE_URL, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller?.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
