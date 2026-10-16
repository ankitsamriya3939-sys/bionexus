// Official Google Analytics 4 (gtag.js) Integration for BioNexus Studio
// Production-only, privacy-compliant, zero PII, lightweight React SPA tracking.

export function initAnalytics() {
  if (typeof window === 'undefined') return;

  // Production-only requirement check
  if (!import.meta.env.PROD) {
    return;
  }

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-81PM8QDEPV';
  if (!gaId || window._gaInitialized) return;

  window._gaInitialized = true;

  // Inject official Google Tag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());

  // Configure GA4 with IP anonymization and privacy compliance
  gtag('config', gaId, {
    send_page_view: true,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_path: window.location.pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackPageView(pagePath) {
  if (typeof window === 'undefined') return;

  // Production-only requirement check
  if (!import.meta.env.PROD) {
    return;
  }

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-81PM8QDEPV';
  if (window.gtag && gaId) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
      page_title: document.title,
    });
  }
}
