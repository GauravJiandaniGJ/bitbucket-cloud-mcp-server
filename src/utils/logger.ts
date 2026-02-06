// All logging goes to stderr - stdout is reserved for MCP stdio transport
export const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.error('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    console.error('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.error('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
};
