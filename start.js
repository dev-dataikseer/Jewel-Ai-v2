const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function start() {
  console.log('Finding available ports...');
  const backendPort = await getAvailablePort();
  const frontendPort = await getAvailablePort();
  
  console.log(`Found available ports: Backend -> ${backendPort}, Frontend -> ${frontendPort}`);
  
  // Write to backend .env
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  let backendEnv = '';
  if (fs.existsSync(backendEnvPath)) {
    backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    backendEnv = backendEnv.replace(/^PORT=.*$/m, '');
  }
  fs.writeFileSync(backendEnvPath, backendEnv + `\nPORT=${backendPort}\n`);
  
  // Write to frontend .env.local
  const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local');
  let frontendEnv = '';
  if (fs.existsSync(frontendEnvPath)) {
    frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
    frontendEnv = frontendEnv.replace(/^NEXT_PUBLIC_API_ORIGIN=.*$/m, '');
    frontendEnv = frontendEnv.replace(/^PORT=.*$/m, '');
  }
  fs.writeFileSync(frontendEnvPath, frontendEnv + `\nNEXT_PUBLIC_API_ORIGIN=http://localhost:${backendPort}\nPORT=${frontendPort}\n`);
  
  console.log('Environment variables updated. Starting servers...');
  
  const concurrently = require('concurrently');
  concurrently([
    { 
      command: 'npm run dev', 
      name: 'backend', 
      cwd: path.join(__dirname, 'backend'), 
      prefixColor: 'blue',
      env: { ...process.env, PORT: backendPort }
    },
    { 
      command: 'npm run dev', 
      name: 'frontend', 
      cwd: path.join(__dirname, 'frontend'), 
      prefixColor: 'magenta',
      env: { ...process.env, PORT: frontendPort, NEXT_PUBLIC_API_ORIGIN: `http://localhost:${backendPort}` }
    }
  ]).result.then(
    () => console.log('Servers stopped.'),
    (err) => console.error('Servers crashed or stopped:', err)
  );
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
