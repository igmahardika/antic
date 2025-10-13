export const logger = {
  info: (...a: unknown[]) => import.meta.env.DEV && console.info(...a),
  warn: (...a: unknown[]) => import.meta.env.DEV && console.warn(...a),
  error: (...a: unknown[]) => console.error(...a)
};