// Device Fingerprinting & Security Verification Service for BioNexus Studio
// Detects operating system, browser, screen characteristics, and device type for security checks

export function detectCurrentDevice() {
  if (typeof window === 'undefined') {
    return {
      id: 'server_env',
      name: 'Server Environment',
      type: 'Desktop',
      os: 'Unknown OS',
      browser: 'Unknown Browser',
      screen: 'Unknown',
      ip: '127.0.0.1'
    };
  }

  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // 1. Detect Operating System
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(userAgent)) os = 'Windows 11 / 10';
  else if (/Windows NT 6.3/i.test(userAgent)) os = 'Windows 8.1';
  else if (/Windows NT 6.1/i.test(userAgent)) os = 'Windows 7';
  else if (/Macintosh|Mac OS X/i.test(userAgent)) os = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/Linux/i.test(userAgent)) os = 'Linux';

  // 2. Detect Browser
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) browser = 'Google Chrome';
  else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/OPR|Opera/i.test(userAgent)) browser = 'Opera';

  // 3. Detect Device Type
  let type = 'Desktop';
  const isMobile = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isTablet) type = 'Tablet';
  else if (isMobile) type = 'Mobile';

  // 4. Screen resolution
  const screenRes = typeof window !== 'undefined' && window.screen 
    ? `${window.screen.width}x${window.screen.height}` 
    : 'Default Resolution';

  // 5. Generate Stable Device Fingerprint Hash
  const rawString = `${os}_${browser}_${type}_${screenRes}_${navigator.language || 'en'}_${navigator.hardwareConcurrency || 4}`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const deviceHash = Math.abs(hash).toString(16);
  const deviceId = `dev_${deviceHash.slice(0, 8)}`;

  return {
    id: deviceId,
    name: `${os} · ${browser}`,
    type,
    os,
    browser,
    screen: screenRes,
    language: navigator.language || 'en-US',
    ip: 'Session Verified (TLS / Local)',
    verifiedAt: new Date().toISOString()
  };
}

// Generates a mock/real 6-digit authentication security code for new device challenges
export function generateDeviceSecurityCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
