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
    // Increase transaction timeout to 15 seconds
    transactionOptions: {
      maxWait: 15000, // 15 seconds max wait to start transaction
      timeout: 15000, // 15 seconds transaction timeout
    },
  });
}

/**
 * Retry database connection with exponential backoff
 */
async function connectWithRetry(client: PrismaClient, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.$connect();
      return;
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
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
    
    // Connect with retry logic in development (silent)
    connectWithRetry(globalForPrisma.prisma).catch(() => {
      // Silent - will retry on demand
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
      await connectWithRetry(this.client, 2); // Fewer retries for on-demand connection
      this.isConnected = true;
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

