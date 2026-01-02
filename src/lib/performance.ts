import { logger } from './logger';

export const initPerformanceMonitoring = () => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
        // Large Contentful Paint
        try {
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    logger.info('LCP:', entry.startTime);
                }
            }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch { /* ignore if not supported */ }

        // First Input Delay
        try {
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    const processingStart = (entry as any).processingStart;
                    if (processingStart) {
                        logger.info('FID processing delay:', processingStart - entry.startTime);
                    }
                }
            }).observe({ type: 'first-input', buffered: true });
        } catch { /* ignore */ }

        // Cumulative Layout Shift
        try {
            new PerformanceObserver((entryList) => {
                let clsValue = 0;
                for (const entry of entryList.getEntries()) {
                    if (!(entry as any).hadRecentInput) {
                        clsValue += (entry as any).value;
                        logger.info('CLS increased by:', (entry as any).value, 'Total:', clsValue);
                    }
                }
            }).observe({ type: 'layout-shift', buffered: true });
        } catch { /* ignore */ }

        // Navigation Timing (Load time)
        window.addEventListener('load', () => {
            const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (nav) {
                logger.info('Page Load Time:', nav.loadEventEnd - nav.startTime);
                logger.info('TTFB:', nav.responseStart - nav.requestStart);
            }
        });

    } catch (e) {
        logger.warn('Performance monitoring failed to initialize', e);
    }
};
