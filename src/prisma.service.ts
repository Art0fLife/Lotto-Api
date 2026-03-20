import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // =====================================================
  // SOFT DELETE PRO METHODS
  // =====================================================

  withDeleted(model: string) {
    return {
      findMany: (args?: any) => {
        return this[model].findMany(args);
      },
      findFirst: (args?: any) => {
        return this[model].findFirst(args);
      },
      count: (args?: any) => {
        return this[model].count(args);
      },
    };
  }

  onlyDeleted(model: string) {
    return {
      findMany: (args?: any) => {
        return this[model].findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: { not: null },
          },
        });
      },
      findFirst: (args?: any) => {
        return this[model].findFirst({
          ...args,
          where: {
            ...args?.where,
            deletedAt: { not: null },
          },
        });
      },
      count: (args?: any) => {
        return this[model].count({
          ...args,
          where: {
            ...args?.where,
            deletedAt: { not: null },
          },
        });
      },
    };
  }

  async restore(model: string, id: number | bigint) {
    return this[model].update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async restoreMany(model: string, where: any) {
    return this[model].updateMany({
      where: {
        ...where,
        deletedAt: { not: null },
      },
      data: { deletedAt: null },
    });
  }

  async forceDelete(model: string, id: number | bigint) {
    return this[model].deleteMany({
      where: { id },
    });
  }

  async forceDeleteMany(model: string, where: any) {
    return this[model].deleteMany({
      where,
    });
  }

  /**
   * Run a function while logging Prisma raw SQL queries for debugging.
   * The listener is registered only for the duration of the function and removed afterwards.
   */
  async withQueryLogging<T>(fn: () => Promise<T>) {
    const handler = (e: any) => {
      console.log('[Prisma Query]', e.query);
      console.log('[Prisma Params]', e.params);
    };

    // register listener
    try {
      // $on is the supported API to listen to query events
      // also try to keep compatibility with EventEmitter removal APIs
      // @ts-ignore
      this.$on('query', handler);
    } catch (err) {
      // ignore if not supported
    }

    try {
      return await fn();
    } finally {
      // remove listener if possible to avoid memory leaks
      try {
        // prefer EventEmitter style removal if available
        // @ts-ignore
        if (typeof (this as any).removeListener === 'function') {
          // @ts-ignore
          (this as any).removeListener('query', handler);
        } else if (typeof (this as any).off === 'function') {
          // @ts-ignore
          (this as any).off('query', handler);
        }
      } catch (err) {
        // best-effort removal; ignore errors
      }
    }
  }
}
