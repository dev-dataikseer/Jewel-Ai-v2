"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_DIR = path_1.default.join(__dirname, '..', 'logs');
fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
const APP_LOG = path_1.default.join(LOG_DIR, 'app.log');
const ERROR_LOG = path_1.default.join(LOG_DIR, 'error.log');
const REQUEST_LOG = path_1.default.join(LOG_DIR, 'request.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024;
function rotateIfNeeded(filePath) {
    try {
        const stat = fs_1.default.statSync(filePath);
        if (stat.size >= MAX_LOG_SIZE) {
            const base = path_1.default.basename(filePath, '.log');
            const dir = path_1.default.dirname(filePath);
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            fs_1.default.renameSync(filePath, path_1.default.join(dir, `${base}-${ts}.log`));
        }
    }
    catch { }
}
function write(filePath, line) {
    rotateIfNeeded(filePath);
    fs_1.default.appendFileSync(filePath, line + '\n');
}
function entry(level, message, context) {
    return JSON.stringify({
        ts: new Date().toISOString(),
        level,
        message,
        ...(context ? { context } : {}),
    });
}
function output(level, filePath, message, context) {
    const e = entry(level, message, context);
    write(filePath, e);
    const consoleMsg = `[${level}] ${message}`;
    switch (level) {
        case 'ERROR':
            console.error(consoleMsg, context ?? '');
            break;
        case 'WARN':
            console.warn(consoleMsg, context ?? '');
            break;
        default:
            console.log(consoleMsg, context ?? '');
            break;
    }
}
exports.logger = {
    info(message, context) {
        output('INFO', APP_LOG, message, context);
    },
    warn(message, context) {
        output('WARN', APP_LOG, message, context);
    },
    error(message, context) {
        output('ERROR', ERROR_LOG, message, context);
    },
    debug(message, context) {
        if (process.env.NODE_ENV !== 'production') {
            output('DEBUG', APP_LOG, message, context);
        }
    },
    request(method, url, status, ms, body) {
        write(REQUEST_LOG, entry('INFO', `${method} ${url} ${status} ${ms}ms`, body ? { body } : undefined));
    },
    getLogs(type, lines = 200) {
        const fileMap = { app: APP_LOG, error: ERROR_LOG, request: REQUEST_LOG };
        const filePath = fileMap[type];
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf-8');
            const all = content.trim().split('\n').filter(Boolean);
            return all.slice(-lines);
        }
        catch {
            return [];
        }
    },
};
