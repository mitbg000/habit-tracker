import { onActivated, onDeactivated, onBeforeUnmount } from 'vue';
import { dataVersion } from '../api';

const MAX_AGE = 60_000;

/**
 * Trang được giữ trong bộ nhớ (KeepAlive) nên quay lại là hiện ngay. Hàm này làm mới ngầm khi
 * dữ liệu có thể đã cũ: vừa có thay đổi ở trang khác, hoặc đã quá 1 phút (kể cả lúc mở lại app).
 */
export function useFreshData(refresh) {
  let version = dataVersion.value;
  let at = Date.now();
  let active = true;
  let first = true;

  function check() {
    if (dataVersion.value === version && Date.now() - at < MAX_AGE) return;
    version = dataVersion.value;
    at = Date.now();
    refresh();
  }
  function onVisible() {
    if (active && document.visibilityState === 'visible') check();
  }

  onActivated(() => {
    active = true;
    if (first) first = false;
    else check();
  });
  onDeactivated(() => {
    active = false;
  });
  document.addEventListener('visibilitychange', onVisible);
  onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible));
}
