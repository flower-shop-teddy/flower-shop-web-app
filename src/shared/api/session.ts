/**
 * Giữ token của phiên đăng nhập.
 *
 * - Access token CHỈ nằm trong bộ nhớ (biến JS): F5 là mất, script độc khó lấy được lâu dài.
 * - Refresh token nằm trong sessionStorage: mất khi đóng tab, không chia sẻ giữa các tab,
 *   không dùng localStorage (tồn tại vô thời hạn). Mức an toàn cao hơn là BFF + cookie HttpOnly,
 *   cần thêm một service phía server, để giai đoạn sau.
 */
export interface TokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number; // giây
  refreshToken: string;
  refreshExpiresIn: number;
  passwordChangeRequired: boolean;
}

const REFRESH_KEY = 'fs.session';

let accessToken: string | null = null;
let accessExpiresAt = 0;

type Listener = (reason: SessionEndReason) => void;
export type SessionEndReason = 'logout' | 'expired' | 'idle' | 'password-changed';
const listeners = new Set<Listener>();

function readRefresh(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export const session = {
  getAccessToken: () => accessToken,
  getRefreshToken: readRefresh,
  /** Access token còn dưới 60 giây thì coi như sắp hết hạn -> làm mới trước khi gọi. */
  isAccessFresh: () => accessToken !== null && Date.now() < accessExpiresAt - 60_000,
  hasSession: () => accessToken !== null || readRefresh() !== null,

  store(t: TokenResponse) {
    accessToken = t.accessToken;
    accessExpiresAt = Date.now() + t.expiresIn * 1000;
    try {
      sessionStorage.setItem(REFRESH_KEY, t.refreshToken);
    } catch {
      /* trình duyệt chặn storage: phiên chỉ sống tới khi access token hết hạn */
    }
  },

  /** Xóa token và báo cho UI (đưa về trang đăng nhập, xóa cache dữ liệu). */
  end(reason: SessionEndReason) {
    accessToken = null;
    accessExpiresAt = 0;
    try {
      sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* bỏ qua */
    }
    listeners.forEach((l) => l(reason));
  },

  onEnd(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
