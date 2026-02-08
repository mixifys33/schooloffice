/**
 * Prisma Database Client
 * Singleton pattern to prevent multiple instances in development
 * Enhanced with connection retry logic for MongoDB Atlas
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma client with enhanced configuration for MongoDB Atlas
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Enhanced connection configuration for MongoDB Atlas
    __internal: {
      engine: {
        connectTimeout: 60000, // 60 seconds
        queryTimeout: 30000,   // 30 seconds
      },
    },
  });
}

/**
 * Retry database connection with exponential backoff
 */
async function connectWithRetry(client: PrismaClient, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔧 [DB] Connection attempt ${attempt}/${maxRetries}...`);
      await client.$connect();
      console.log('✅ [DB] Database connected successfully');
      return;
    } catch (error: any) {
      console.error(`❌ [DB] Connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('❌ [DB] All connection attempts failed');
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`🔧 [DB] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prismaInstance = createPrismaClient();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    
    // Connect with retry logic in development
    connectWithRetry(globalForPrisma.prisma)
      .catch((error) => {
        console.error('❌ FATAL: Development Database connection failed after all retries:', error);
        console.error('Please check:');
        console.error('1. Your .env DATABASE_URL is correct');
        console.error('2. MongoDB Atlas cluster is running');
        console.error('3. Your IP is whitelisted in MongoDB Atlas');
        console.error('4. Network connectivity to MongoDB Atlas');
        // Don't exit in development - let the app start and retry on demand
      });
  }
  prismaInstance = globalForPrisma.prisma;
}

/**
 * Enhanced Prisma client with automatic reconnection
 */
class EnhancedPrismaClient {
  private client: PrismaClient;
  private isConnected = false;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  /**
   * Ensure connection before executing queries
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      try {
        await connectWithRetry(this.client, 2); // Fewer retries for on-demand connection
        this.isConnected = true;
      } catch (error) {
        console.error('❌ [DB] Failed to establish connection:', error);
        throw error;
      }
    }
  }

  /**
   * Proxy all Prisma methods with connection retry
   */
  get user() {
    return new Proxy(this.client.user, {
      get: (target, prop) => {
        const originalMethod = target[prop as keyof typeof target];
        if (typeof originalMethod === 'function') {
          return async (...args: any[]) => {
            await this.ensureConnection();
            try {
              return await (originalMethod as any).apply(target, args);
            } catch (error: any) {
              // Reset connection flag on connection errors
              if (error.message?.includes('Server selection timeout') || 
                  error.message?.includes('No such host is known')) {
                console.log('🔧 [DB] Connection error detected, will retry on next request');
                this.isConnected = false;
              }
              throw error;
            }
          };
        }
        return originalMethod;
      }
    });
  }

  get school() {
    return new Proxy(this.client.school, {
      get: (target, prop) => {
        const originalMethod = target[prop as keyof typeof target];
        if (typeof originalMethod === 'function') {
          return async (...args: any[]) => {
            await this.ensureConnection();
            try {
              return await (originalMethod as any).apply(target, args);
            } catch (error: any) {
              if (error.message?.includes('Server selection timeout') || 
                  error.message?.includes('No such host is known')) {
                console.log('🔧 [DB] Connection error detected, will retry on next request');
                this.isConnected = false;
              }
              throw error;
            }
          };
        }
        return originalMethod;
      }
    });
  }

  // Proxy other commonly used models
  get authAuditLog() { return this.client.authAuditLog; }
  get staff() { return this.client.staff; }
  
  // Proxy utility methods
  async $connect() {
    return this.client.$connect();
  }
  
  async $disconnect() {
    this.isConnected = false;
    return this.client.$disconnect();
  }
  
  // Proxy all other properties
  [key: string]: any;
}

// Create enhanced client proxy
const enhancedClient = new EnhancedPrismaClient(prismaInstance);

// Proxy all remaining properties dynamically
const prismaProxy = new Proxy(enhancedClient, {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target];
    }
    // Fallback to original client for any missing properties
    return (prismaInstance as any)[prop];
  }
});

export const prisma = prismaProxy as PrismaClient;
export const db = prisma; // Export as 'db' for backward compatibility

export default prisma;

