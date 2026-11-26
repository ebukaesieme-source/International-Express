declare const __APP_BUILD_VERSION__: string;

const RELOAD_GUARD_KEY = 'iec_auto_reload_guard';
const RELOAD_COOLDOWN_MS = 30_000;
const POLL_INTERVAL_MS = 15_000;
const MIN_CHECK_GAP_MS = 3_000;

interface ReloadGuard {
  version: string;
  at: number;
}

function getCurrentBuildVersion(): string {
  try {
    return typeof __APP_BUILD_VERSION__ === 'string' ? __APP_BUILD_VERSION__ : '';
  } catch {
    return '';
  }
}

function readReloadGuard(): ReloadGuard | null {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReloadGuard>;
    if (typeof parsed.version === 'string' && typeof parsed.at === 'number') {
      return { version: parsed.version, at: parsed.at };
    }
  } catch {
    // ignore storage access issues
  }
  return null;
}

function writeReloadGuard(version: string): void {
  try {
    const payload: ReloadGuard = { version, at: Date.now() };
    sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage access issues
  }
}

function clearReloadGuardIfCurrent(currentVersion: string): void {
  const guard = readReloadGuard();
  if (guard && guard.version === currentVersion) {
    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      // ignore
    }
  }
}

async function clearBrowserCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
  } catch {
    // ignore cache clear errors
  }
}

async function triggerHardReload(targetVersion: string): Promise<void> {
  const guard = readReloadGuard();
  if (
    guard &&
    guard.version === targetVersion &&
    Date.now() - guard.at < RELOAD_COOLDOWN_MS
  ) {
    return;
  }

  writeReloadGuard(targetVersion);
  await clearBrowserCaches();
  window.location.reload();
}

/**
 * Watches for newly pushed/deployed builds via /version.json and stale chunk
 * preload errors, then automatically refreshes the entire site cleanly.
 */
export function startAutoRefreshOnDeploy(): () => void {
  const currentVersion = getCurrentBuildVersion();
  if (!currentVersion) {
    return () => {};
  }

  clearReloadGuardIfCurrent(currentVersion);

  let isDisposed = false;
  let isChecking = false;
  let lastCheckAt = 0;

  const checkForNewVersion = async (force = false) => {
    if (isDisposed || isChecking) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!force && document.visibilityState === 'hidden') return;

    const now = Date.now();
    if (!force && now - lastCheckAt < MIN_CHECK_GAP_MS) return;

    isChecking = true;
    lastCheckAt = now;

    try {
      const response = await fetch(`/version.json?t=${now}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) return;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;

      const data = (await response.json()) as { version?: unknown };
      const latestVersion = typeof data?.version === 'string' ? data.version.trim() : '';

      if (latestVersion && latestVersion !== currentVersion && !isDisposed) {
        await triggerHardReload(latestVersion);
      }
    } catch {
      // Transient offline / server restart error — retry on next poll
    } finally {
      isChecking = false;
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void checkForNewVersion(false);
    }
  };

  const handleFocus = () => {
    void checkForNewVersion(false);
  };

  const handleOnline = () => {
    void checkForNewVersion(true);
  };

  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      void checkForNewVersion(true);
    }
  };

  const handleVitePreloadError = (event: Event) => {
    event.preventDefault();
    void triggerHardReload(`preload-error-${Math.floor(Date.now() / RELOAD_COOLDOWN_MS)}`);
  };

  const initialTimer = window.setTimeout(() => {
    void checkForNewVersion(true);
  }, 3000);

  const pollTimer = window.setInterval(() => {
    void checkForNewVersion(false);
  }, POLL_INTERVAL_MS);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleOnline);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('vite:preloadError', handleVitePreloadError);

  return () => {
    isDisposed = true;
    window.clearTimeout(initialTimer);
    window.clearInterval(pollTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('vite:preloadError', handleVitePreloadError);
  };
}
