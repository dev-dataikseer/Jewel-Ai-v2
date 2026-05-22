import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '..', 'logs');

fs.mkdirSync(LOG_DIR, { recursive: true });

const APP_LOG = path.join(LOG_DIR, 'app.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const REQUEST_LOG = path.join(LOG_DIR, 'request.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024;

function rotateIfNeeded(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size >= MAX_LOG_SIZE) {
      const base = path.basename(filePath, '.log');
      const dir = path.dirname(filePath);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      fs.renameSync(filePath, path.join(dir, `${base}-${ts}.log`));
    }
  } catch { }
}

function write(filePath: string, line: string) {
  rotateIfNeeded(filePath);
  fs.appendFileSync(filePath, line + '\n');
}

type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function entry(level: Level, message: string, context?: Record<string, unknown>) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  });
}

function output(level: Level, filePath: string, message: string, context?: Record<string, unknown>) {
  const e = entry(level, message, context);
  write(filePath, e);
  const consoleMsg = `[${level}] ${message}`;
  switch (level) {
    case 'ERROR': console.error(consoleMsg, context ?? ''); break;
    case 'WARN': console.warn(consoleMsg, context ?? ''); break;
    default: console.log(consoleMsg, context ?? ''); break;
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    output('INFO', APP_LOG, message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    output('WARN', APP_LOG, message, context);
  },
  error(message: string, context?: Record<string, unknown>) {
    output('ERROR', ERROR_LOG, message, context);
  },
  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      output('DEBUG', APP_LOG, message, context);
    }
  },
  request(method: string, url: string, status: number, ms: number, body?: unknown) {
    write(REQUEST_LOG, entry('INFO', `${method} ${url} ${status} ${ms}ms`, body ? { body } : undefined));
  },
  getLogs(type: 'app' | 'error' | 'request', lines = 200): string[] {
    const fileMap = { app: APP_LOG, error: ERROR_LOG, request: REQUEST_LOG };
    const filePath = fileMap[type];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const all = content.trim().split('\n').filter(Boolean);
      return all.slice(-lines);
    } catch {
      return [];
    }
  },
};
