export type DetectedDeviceType = 'Mobile Phone' | 'Tablet' | 'Desktop / Laptop';

export interface DetectedDeviceInfo {
  deviceName: string;
  deviceType: DetectedDeviceType;
  deviceModel: string;
  os: string;
  browser: string;
  screenResolution: string;
  timezone: string;
  userAgent: string;
}

function parseBrowser(ua: string): string {
  if (/SamsungBrowser\/([\d.]+)/i.test(ua)) return 'Samsung Internet';
  if (/EdgA?\/([\d.]+)/i.test(ua) || /EdgiOS\/([\d.]+)/i.test(ua)) return 'Microsoft Edge';
  if (/OPR\/([\d.]+)/i.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if (/CriOS\/([\d.]+)/i.test(ua)) return 'Chrome (iOS)';
  if (/FxiOS\/([\d.]+)/i.test(ua) || /Firefox\/([\d.]+)/i.test(ua)) return 'Firefox';
  if (/UCBrowser/i.test(ua)) return 'UC Browser';
  if (/Chrome\/([\d.]+)/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg/i.test(ua)) return 'Safari';
  return 'Web Browser';
}

function formatDeviceModelBrand(rawModel: string): string {
  const cleaned = rawModel.replace(/\s*Build\/.*$/i, '').trim();
  if (!cleaned || cleaned === 'K') return '';

  // Nokia (HMD Global models often start with TA- or Nokia)
  if (/^Nokia/i.test(cleaned)) return cleaned;
  if (/^TA-\d+/i.test(cleaned)) return `Nokia (${cleaned})`;

  // Samsung
  if (/^SM-S9/i.test(cleaned)) return `Samsung Galaxy S (${cleaned})`;
  if (/^SM-A/i.test(cleaned)) return `Samsung Galaxy A (${cleaned})`;
  if (/^SM-F/i.test(cleaned)) return `Samsung Galaxy Fold/Flip (${cleaned})`;
  if (/^SM-N/i.test(cleaned)) return `Samsung Galaxy Note (${cleaned})`;
  if (/^SM-T|^SM-X/i.test(cleaned)) return `Samsung Galaxy Tab (${cleaned})`;
  if (/^SM-|^GT-|^SCH-|^SGH-/i.test(cleaned)) return `Samsung Galaxy (${cleaned})`;

  // Google Pixel
  if (/^Pixel/i.test(cleaned)) return `Google ${cleaned}`;

  // TECNO / Infinix / itel
  if (/^TECNO/i.test(cleaned)) return cleaned;
  if (/^Infinix/i.test(cleaned)) return cleaned;
  if (/^itel/i.test(cleaned)) return `itel (${cleaned})`;

  // Xiaomi / Redmi / POCO
  if (/^Redmi|^POCO|^Xiaomi/i.test(cleaned)) return cleaned;
  if (/^Mi\s|^M2\d|^22\d|^23\d|^24\d/i.test(cleaned)) return `Xiaomi / Redmi (${cleaned})`;

  // OPPO / Realme
  if (/^OPPO|^Realme/i.test(cleaned)) return cleaned;
  if (/^CPH/i.test(cleaned)) return `OPPO (${cleaned})`;
  if (/^RMX/i.test(cleaned)) return `Realme (${cleaned})`;

  // vivo / iQOO
  if (/^vivo|^iQOO/i.test(cleaned)) return cleaned;
  if (/^V\d{4}/i.test(cleaned)) return `vivo (${cleaned})`;

  // Motorola
  if (/^moto/i.test(cleaned)) return `Motorola ${cleaned}`;

  // OnePlus
  if (/^ONEPLUS|^OnePlus/i.test(cleaned)) return cleaned;
  if (/^LE\d|^NE\d|^KB\d|^IN\d|^GM\d|^AC\d|^DN\d|^CPH24|^CPH25/i.test(cleaned)) return `OnePlus (${cleaned})`;

  // Huawei / Honor
  if (/^HUAWEI|^HONOR/i.test(cleaned)) return cleaned;
  if (/^ELS|^ANA|^NOH|^VOG|^ELE|^CLT|^LYA/i.test(cleaned)) return `Huawei (${cleaned})`;

  // Sony / LG / HTC / Lenovo / ASUS / ZTE / Nothing / Dell / HP / Acer
  if (/^XQ-|^SO-|^SOV/i.test(cleaned)) return `Sony Xperia (${cleaned})`;
  if (/^LM-|^LG-/i.test(cleaned)) return `LG (${cleaned})`;
  if (/^Lenovo|^TB-/i.test(cleaned)) return `Lenovo (${cleaned})`;
  if (/^ASUS|^ROG|^Zenfone/i.test(cleaned)) return `ASUS (${cleaned})`;
  if (/^Dell/i.test(cleaned)) return cleaned;
  if (/^HP\s/i.test(cleaned)) return cleaned;
  if (/^Acer/i.test(cleaned)) return cleaned;
  if (/^Nothing|^A06\d/i.test(cleaned)) return `Nothing Phone (${cleaned})`;

  return cleaned;
}

function detectPcOemOrGpuHint(ua: string): string {
  // Check if OEM name is explicitly present in UA string
  const oemPatterns: Array<[RegExp, string]> = [
    [/Dell/i, 'Dell'],
    [/Hewlett-Packard|\bHP\b/i, 'HP'],
    [/Lenovo|ThinkPad/i, 'Lenovo'],
    [/ASUS|ROG/i, 'ASUS'],
    [/Acer/i, 'Acer'],
    [/MSI/i, 'MSI'],
    [/Surface/i, 'Microsoft Surface'],
    [/Samsung/i, 'Samsung'],
    [/Toshiba/i, 'Toshiba'],
    [/Sony|VAIO/i, 'Sony']
  ];
  for (const [regex, label] of oemPatterns) {
    if (regex.test(ua)) return label;
  }

  // Try lightweight WebGL GPU renderer hint for desktop hardware identification
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
          if (/Apple M\d/i.test(renderer)) {
            const m = renderer.match(/Apple M\d(\s+(Pro|Max|Ultra))?/i);
            return m ? m[0] : 'Apple Silicon';
          }
          if (/NVIDIA|GeForce|RTX|GTX/i.test(renderer)) {
            const m = renderer.match(/(RTX|GTX|GeForce)\s*[A-Z0-9\s]{2,12}/i);
            return m ? `NVIDIA ${m[0].trim()}` : 'NVIDIA GPU';
          }
          if (/AMD|Radeon/i.test(renderer)) return 'AMD Radeon';
          if (/Intel/i.test(renderer)) return 'Intel Graphics';
        }
      }
    } catch {
      // Ignore WebGL restrictions
    }
  }
  return '';
}

function buildDeviceInfoFromSignals(
  ua: string,
  highEntropy?: {
    model?: string;
    platform?: string;
    platformVersion?: string;
    mobile?: boolean;
  }
): DetectedDeviceInfo {
  const platform = highEntropy?.platform || (navigator as any).userAgentData?.platform || navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const browser = parseBrowser(ua);

  const screenWidth = typeof window !== 'undefined' && window.screen ? window.screen.width : 0;
  const screenHeight = typeof window !== 'undefined' && window.screen ? window.screen.height : 0;
  const screenResolution = screenWidth && screenHeight ? `${screenWidth}x${screenHeight}` : 'Unknown';

  let timezone = 'Unknown';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
  } catch {}

  let deviceType: DetectedDeviceType = 'Desktop / Laptop';
  let deviceModel = 'Computer';
  let os = 'Unknown OS';

  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  const rawHintModel = (highEntropy?.model || '').trim();

  if (/iPhone/i.test(ua)) {
    deviceType = 'Mobile Phone';
    deviceModel = 'Apple iPhone';
    const iosMatch = ua.match(/OS (\d+[_.\d]*)/i);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
  } else if (isIPad) {
    deviceType = 'Tablet';
    deviceModel = 'Apple iPad';
    const iosMatch = ua.match(/OS (\d+[_.\d]*)/i);
    os = iosMatch ? `iPadOS ${iosMatch[1].replace(/_/g, '.')}` : 'iPadOS';
  } else if (/Android/i.test(ua) || /Android/i.test(platform)) {
    const androidVerFromHint = highEntropy?.platformVersion ? highEntropy.platformVersion.split('.')[0] : '';
    const androidVerMatch = ua.match(/Android\s+([\d.]+)/i);
    const ver = androidVerFromHint || (androidVerMatch ? androidVerMatch[1] : '');
    os = ver ? `Android ${ver}` : 'Android';

    const isMobileUa = highEntropy?.mobile !== undefined ? highEntropy.mobile : /Mobile/i.test(ua);
    deviceType = isMobileUa ? 'Mobile Phone' : 'Tablet';

    const uaModelMatch = ua.match(/Android\s+[\d.]+;\s*(?:[a-z]{2}(?:-[A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/|\))/i);
    const candidateModel = rawHintModel || (uaModelMatch ? uaModelMatch[1].trim() : '');
    const formatted = formatDeviceModelBrand(candidateModel);
    deviceModel = formatted || (isMobileUa ? 'Android Phone' : 'Android Tablet');
  } else if (/Windows NT/i.test(ua) || /Windows/i.test(platform)) {
    deviceType = 'Desktop / Laptop';
    const majorWinVer = highEntropy?.platformVersion ? parseInt(highEntropy.platformVersion.split('.')[0], 10) : NaN;
    if (Number.isFinite(majorWinVer) && majorWinVer >= 13) {
      os = 'Windows 11';
    } else if (/Windows NT 10\.0/i.test(ua)) {
      os = Number.isFinite(majorWinVer) && majorWinVer > 0 ? 'Windows 10' : 'Windows 10/11';
    } else if (/Windows NT 6\.3/i.test(ua)) {
      os = 'Windows 8.1';
    } else if (/Windows NT 6\.2/i.test(ua)) {
      os = 'Windows 8';
    } else if (/Windows NT 6\.1/i.test(ua)) {
      os = 'Windows 7';
    } else {
      os = 'Windows';
    }

    const hintFormatted = formatDeviceModelBrand(rawHintModel);
    const pcHint = hintFormatted || detectPcOemOrGpuHint(ua);
    deviceModel = pcHint ? `${pcHint} Windows PC` : 'Windows PC';
  } else if (/CrOS/i.test(ua) || /Chrome OS/i.test(platform)) {
    deviceType = 'Desktop / Laptop';
    deviceModel = rawHintModel ? `Chromebook (${rawHintModel})` : 'Chromebook';
    os = 'ChromeOS';
  } else if (/Macintosh|Mac OS X/i.test(ua) || /macOS/i.test(platform)) {
    deviceType = 'Desktop / Laptop';
    const macHint = detectPcOemOrGpuHint(ua);
    deviceModel = macHint && /Apple M/i.test(macHint) ? `Apple Mac / MacBook (${macHint})` : 'Apple Mac / MacBook';
    const macMatch = ua.match(/Mac OS X (\d+[_.\d]*)/i);
    const macVer = highEntropy?.platformVersion || (macMatch ? macMatch[1].replace(/_/g, '.') : '');
    os = macVer ? `macOS ${macVer}` : 'macOS';
  } else if (/Linux/i.test(ua) || /Linux/i.test(platform)) {
    deviceType = 'Desktop / Laptop';
    const pcHint = formatDeviceModelBrand(rawHintModel) || detectPcOemOrGpuHint(ua);
    deviceModel = pcHint ? `${pcHint} Linux PC` : 'Linux PC';
    os = 'Linux';
  }

  const deviceName = `${deviceModel} (${os} • ${browser})`;

  return {
    deviceName,
    deviceType,
    deviceModel,
    os,
    browser,
    screenResolution,
    timezone,
    userAgent: ua.slice(0, 300)
  };
}

export function detectCurrentDeviceInfo(): DetectedDeviceInfo {
  if (typeof navigator === 'undefined') {
    return {
      deviceName: 'Unknown Device',
      deviceType: 'Desktop / Laptop',
      deviceModel: 'Unknown',
      os: 'Unknown OS',
      browser: 'Unknown Browser',
      screenResolution: 'Unknown',
      timezone: 'UTC',
      userAgent: ''
    };
  }
  return buildDeviceInfoFromSignals(navigator.userAgent || '');
}

/**
 * Uses modern User-Agent Client Hints (getHighEntropyValues) when available to obtain
 * real hardware model names (e.g. Nokia, Samsung Galaxy, Pixel, Windows 11, etc.) even
 * on browsers with frozen UA strings.
 */
export async function detectCurrentDeviceInfoAsync(): Promise<DetectedDeviceInfo> {
  if (typeof navigator === 'undefined') {
    return detectCurrentDeviceInfo();
  }
  const ua = navigator.userAgent || '';
  const uaData = (navigator as any).userAgentData;
  if (uaData && typeof uaData.getHighEntropyValues === 'function') {
    try {
      const hints = await uaData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
        'mobile'
      ]);
      return buildDeviceInfoFromSignals(ua, {
        model: hints?.model,
        platform: hints?.platform || uaData.platform,
        platformVersion: hints?.platformVersion,
        mobile: typeof hints?.mobile === 'boolean' ? hints.mobile : uaData.mobile
      });
    } catch {
      // Fall back to synchronous UA parser
    }
  }
  return buildDeviceInfoFromSignals(ua);
}

export function getHoursAgo(isoTimestamp: string, nowMs: number = Date.now()): number {
  const ts = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(ts)) return 0;
  const diffMs = Math.max(0, nowMs - ts);
  return diffMs / (1000 * 60 * 60);
}

export function formatHoursAgoLabel(isoTimestamp: string, nowMs: number = Date.now()): string {
  const hours = getHoursAgo(isoTimestamp, nowMs);
  const mins = Math.floor(hours * 60);

  if (mins < 1) return 'Just now (0 hrs ago)';
  if (mins < 60) {
    const roundedHrs = hours.toFixed(1);
    return `${roundedHrs} hrs ago (${mins} ${mins === 1 ? 'min' : 'mins'} ago)`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} hrs ago`;
  }
  const wholeHours = Math.floor(hours);
  const days = Math.floor(wholeHours / 24);
  const remHours = wholeHours % 24;
  return `${wholeHours} hrs ago (${days}d ${remHours}h ago)`;
}

export function formatExactDateTime(isoTimestamp: string): { date: string; time: string; full: string } {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) {
    return { date: 'Unknown Date', time: 'Unknown Time', full: 'Unknown' };
  }
  const date = d.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const time = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return { date, time, full: `${date} • ${time}` };
}
