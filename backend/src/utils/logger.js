const timestamp = () => new Date().toISOString();

export const logger = {
  info: (scope, message, extra) =>
    console.log(`[${timestamp()}] [INFO] [${scope}] ${message}`, extra ?? ''),
  warn: (scope, message, extra) =>
    console.warn(`[${timestamp()}] [WARN] [${scope}] ${message}`, extra ?? ''),
  error: (scope, message, extra) =>
    console.error(`[${timestamp()}] [ERROR] [${scope}] ${message}`, extra ?? ''),
};
