// Simple script to run Prisma commands one by one
const { spawn } = require('child_process');

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { stdio: 'inherit' });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    console.log('Step 1: Installing dependencies...');
    await runCommand('npm', ['install']);
    
    console.log('Step 2: Generating Prisma client...');
    await runCommand('npx', ['prisma', 'generate']);
    
    console.log('Step 3: Pushing schema to database...');
    await runCommand('npx', ['prisma', 'db', 'push']);
    
    console.log('All steps completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  }
}

main();