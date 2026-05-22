// This file serves as the main production entry point for Hostinger (Phusion Passenger).
const fs = require('fs');
const path = require('path');

// Log uncaught errors but DO NOT exit — Passenger manages process lifecycle
process.on('uncaughtException', (err) => {
  const logMessage = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION:\n${err.stack || err}\n\n`;
  fs.appendFileSync(path.join(__dirname, 'crash.log'), logMessage);
  console.error(logMessage);
});

process.on('unhandledRejection', (reason, promise) => {
  const logMessage = `[${new Date().toISOString()}] UNHANDLED REJECTION:\nReason: ${reason?.stack || reason}\n\n`;
  fs.appendFileSync(path.join(__dirname, 'crash.log'), logMessage);
  console.error(logMessage);
});

process.env.NODE_ENV = 'production';

// Load environment variables from backend/.env explicitly
const dotenvPath = path.join(__dirname, 'backend', 'node_modules', 'dotenv');
const rootDotenvPath = path.join(__dirname, 'node_modules', 'dotenv');
const envPath = path.join(__dirname, 'backend', '.env');
const resolvedDotenv = fs.existsSync(rootDotenvPath) ? rootDotenvPath : (fs.existsSync(dotenvPath) ? dotenvPath : null);

if (resolvedDotenv && fs.existsSync(envPath)) {
  try {
    require(resolvedDotenv).config({ path: envPath });
    console.log('◇ injected env from backend/.env');
  } catch (err) {
    console.error('Failed to load environment variables:', err);
  }
}

console.log('Starting Jewel AI Studio in Production Mode...');
require('./backend/dist/index.js');
