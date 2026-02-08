#!/usr/bin/env node

/**
 * Comprehensive Database Connection Diagnostic Tool
 * Diagnoses MongoDB Atlas connectivity issues on Windows
 */

const { PrismaClient } = require('@prisma/client');
const dns = require('dns').promises;
const net = require('net');
const https = require('https');
const { URL } = require('url');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function parseMongoUri(uri) {
  try {
    // Extract components from MongoDB URI
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(\?.*)?/);
    if (!match) {
      throw new Error('Invalid MongoDB URI format');
    }
    
    return {
      username: decodeURIComponent(match[1]),
      password: decodeURIComponent(match[2]),
      cluster: match[3],
      database: match[4],
      options: match[5] || ''
    };
  } catch (error) {
    throw new Error(`Failed to parse MongoDB URI: ${error.message}`);
  }
}

async function checkDNSResolution(hostname) {
  log(colors.blue, `\n🔍 Testing DNS resolution for: ${hostname}`);
  
  try {
    const addresses = await dns.resolve4(hostname);
    log(colors.green, `✅ DNS Resolution successful: ${addresses.join(', ')}`);
    return { success: true, addresses };
  } catch (error) {
    log(colors.red, `❌ DNS Resolution failed: ${error.message}`);
    
    // Try alternative DNS servers
    const alternativeDNS = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];
    log(colors.yellow, `🔄 Trying alternative DNS servers...`);
    
    for (const dnsServer of alternativeDNS) {
      try {
        dns.setServers([dnsServer]);
        const addresses = await dns.resolve4(hostname);
        log(colors.green, `✅ DNS Resolution successful with ${dnsServer}: ${addresses.join(', ')}`);
        return { success: true, addresses, usedDNS: dnsServer };
      } catch (altError) {
        log(colors.yellow, `⚠️ Failed with ${dnsServer}: ${altError.message}`);
      }
    }
    
    return { success: false, error: error.message };
  }
}

async function checkTCPConnection(hostname, port = 27017) {
  log(colors.blue, `\n🔌 Testing TCP connection to: ${hostname}:${port}`);
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 10000; // 10 seconds
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      log(colors.green, `✅ TCP connection successful to ${hostname}:${port}`);
      socket.destroy();
      resolve({ success: true });
    });
    
    socket.on('timeout', () => {
      log(colors.red, `❌ TCP connection timeout to ${hostname}:${port}`);
      socket.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });
    
    socket.on('error', (error) => {
      log(colors.red, `❌ TCP connection failed to ${hostname}:${port}: ${error.message}`);
      socket.destroy();
      resolve({ success: false, error: error.message });
    });
    
    try {
      socket.connect(port, hostname);
    } catch (error) {
      log(colors.red, `❌ Failed to initiate connection: ${error.message}`);
      resolve({ success: false, error: error.message });
    }
  });
}

async function checkHTTPSConnection(hostname) {
  log(colors.blue, `\n🌐 Testing HTTPS connection to: ${hostname}`);
  
  return new Promise((resolve) => {
    const options = {
      hostname: hostname,
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      log(colors.green, `✅ HTTPS connection successful to ${hostname} (Status: ${res.statusCode})`);
      resolve({ success: true, statusCode: res.statusCode });
    });
    
    req.on('timeout', () => {
      log(colors.red, `❌ HTTPS connection timeout to ${hostname}`);
      req.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });
    
    req.on('error', (error) => {
      log(colors.red, `❌ HTTPS connection failed to ${hostname}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.end();
  });
}

async function checkNetworkConfiguration() {
  log(colors.blue, `\n🔧 Checking network configuration...`);
  
  try {
    // Check if we can reach Google DNS
    const googleDNS = await checkTCPConnection('8.8.8.8', 53);
    if (googleDNS.success) {
      log(colors.green, `✅ Can reach Google DNS (8.8.8.8:53)`);
    } else {
      log(colors.red, `❌ Cannot reach Google DNS: ${googleDNS.error}`);
    }
    
    // Check if we can reach Cloudflare DNS
    const cloudflareDNS = await checkTCPConnection('1.1.1.1', 53);
    if (cloudflareDNS.success) {
      log(colors.green, `✅ Can reach Cloudflare DNS (1.1.1.1:53)`);
    } else {
      log(colors.red, `❌ Cannot reach Cloudflare DNS: ${cloudflareDNS.error}`);
    }
    
    // Check if we can reach a common website
    const googleHTTPS = await checkHTTPSConnection('www.google.com');
    if (googleHTTPS.success) {
      log(colors.green, `✅ Can reach Google via HTTPS`);
    } else {
      log(colors.red, `❌ Cannot reach Google via HTTPS: ${googleHTTPS.error}`);
    }
    
  } catch (error) {
    log(colors.red, `❌ Network configuration check failed: ${error.message}`);
  }
}

async function testPrismaConnection() {
  log(colors.blue, `\n🗄️ Testing Prisma connection...`);
  
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  try {
    // Test basic connection
    await prisma.$connect();
    log(colors.green, `✅ Prisma connection successful`);
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    log(colors.green, `✅ Database query successful: ${JSON.stringify(result)}`);
    
    await prisma.$disconnect();
    return { success: true };
    
  } catch (error) {
    log(colors.red, `❌ Prisma connection failed: ${error.message}`);
    
    // Try to disconnect gracefully
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      log(colors.yellow, `⚠️ Failed to disconnect Prisma: ${disconnectError.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

async function checkWindowsFirewall() {
  log(colors.blue, `\n🛡️ Checking Windows Firewall status...`);
  
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('netsh advfirewall show allprofiles state', (error, stdout, stderr) => {
      if (error) {
        log(colors.yellow, `⚠️ Could not check firewall status: ${error.message}`);
        resolve({ success: false, error: error.message });
        return;
      }
      
      const output = stdout.toString();
      log(colors.cyan, `Firewall Status:\n${output}`);
      
      if (output.includes('State                                 ON')) {
        log(colors.yellow, `⚠️ Windows Firewall is ON - this might block MongoDB connections`);
        log(colors.cyan, `💡 Consider temporarily disabling firewall or adding MongoDB exception`);
      } else {
        log(colors.green, `✅ Windows Firewall appears to be OFF`);
      }
      
      resolve({ success: true, output });
    });
  });
}

async function suggestSolutions(diagnosticResults) {
  log(colors.magenta, `\n💡 DIAGNOSTIC SUMMARY & SOLUTIONS:`);
  log(colors.magenta, `${'='.repeat(50)}`);
  
  const { dnsResult, tcpResult, httpsResult, prismaResult } = diagnosticResults;
  
  if (!dnsResult.success) {
    log(colors.red, `\n🔴 DNS RESOLUTION ISSUE DETECTED`);
    log(colors.cyan, `Solutions:`);
    log(colors.cyan, `1. Change DNS servers to Google DNS (8.8.8.8, 1.1.1.1)`);
    log(colors.cyan, `2. Flush DNS cache: ipconfig /flushdns`);
    log(colors.cyan, `3. Reset network adapter: netsh winsock reset`);
    log(colors.cyan, `4. Check if VPN is interfering`);
  }
  
  if (!tcpResult.success) {
    log(colors.red, `\n🔴 TCP CONNECTION ISSUE DETECTED`);
    log(colors.cyan, `Solutions:`);
    log(colors.cyan, `1. Check Windows Firewall settings`);
    log(colors.cyan, `2. Check antivirus software blocking connections`);
    log(colors.cyan, `3. Try different network (mobile hotspot)`);
    log(colors.cyan, `4. Check if corporate firewall is blocking port 27017`);
  }
  
  if (!httpsResult.success) {
    log(colors.red, `\n🔴 GENERAL NETWORK CONNECTIVITY ISSUE`);
    log(colors.cyan, `Solutions:`);
    log(colors.cyan, `1. Check internet connection`);
    log(colors.cyan, `2. Restart network adapter`);
    log(colors.cyan, `3. Check proxy settings`);
    log(colors.cyan, `4. Try different network connection`);
  }
  
  if (!prismaResult.success) {
    log(colors.red, `\n🔴 DATABASE CONNECTION ISSUE`);
    log(colors.cyan, `Solutions:`);
    log(colors.cyan, `1. Verify MongoDB Atlas cluster is running`);
    log(colors.cyan, `2. Check IP whitelist in MongoDB Atlas`);
    log(colors.cyan, `3. Verify database credentials`);
    log(colors.cyan, `4. Check connection string format`);
  }
  
  // Immediate fixes to try
  log(colors.yellow, `\n⚡ IMMEDIATE FIXES TO TRY:`);
  log(colors.yellow, `${'='.repeat(30)}`);
  log(colors.cyan, `1. Run as Administrator: ipconfig /flushdns`);
  log(colors.cyan, `2. Run as Administrator: netsh winsock reset`);
  log(colors.cyan, `3. Temporarily disable Windows Firewall`);
  log(colors.cyan, `4. Try mobile hotspot connection`);
  log(colors.cyan, `5. Add 0.0.0.0/0 to MongoDB Atlas IP whitelist`);
  log(colors.cyan, `6. Restart your computer`);
}

async function main() {
  log(colors.bold + colors.magenta, `
╔══════════════════════════════════════════════════════════════╗
║                DATABASE CONNECTION DIAGNOSTICS               ║
║                     Windows Network Debug                    ║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    log(colors.red, `❌ DATABASE_URL environment variable not found`);
    process.exit(1);
  }
  
  log(colors.cyan, `Database URL: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);
  
  try {
    // Parse MongoDB URI
    const mongoConfig = parseMongoUri(databaseUrl);
    log(colors.cyan, `Cluster: ${mongoConfig.cluster}`);
    log(colors.cyan, `Database: ${mongoConfig.database}`);
    log(colors.cyan, `Username: ${mongoConfig.username}`);
    
    // Run diagnostics
    const dnsResult = await checkDNSResolution(mongoConfig.cluster);
    const tcpResult = await checkTCPConnection(mongoConfig.cluster, 27017);
    const httpsResult = await checkHTTPSConnection('www.google.com');
    await checkNetworkConfiguration();
    await checkWindowsFirewall();
    const prismaResult = await testPrismaConnection();
    
    // Provide solutions
    await suggestSolutions({
      dnsResult,
      tcpResult,
      httpsResult,
      prismaResult
    });
    
    // Final status
    if (prismaResult.success) {
      log(colors.green + colors.bold, `\n🎉 DATABASE CONNECTION IS WORKING!`);
    } else {
      log(colors.red + colors.bold, `\n💥 DATABASE CONNECTION FAILED - Follow solutions above`);
    }
    
  } catch (error) {
    log(colors.red, `❌ Diagnostic failed: ${error.message}`);
    console.error(error);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(colors.red, `💥 Uncaught Exception: ${error.message}`);
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(colors.red, `💥 Unhandled Rejection at: ${promise}, reason: ${reason}`);
  console.error(reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}