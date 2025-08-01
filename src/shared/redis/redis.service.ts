// redis/redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: 'localhost',
            port: 6379,
        });
        console.log('Re-dis service initialized');

    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
        if (options?.EX) {
            await this.client.set(key, value, 'EX', options.EX);
        } else {
            await this.client.set(key, value);
        }
    } async ping(): Promise<string> {
        return this.client.ping(); // returns "PONG"
    }

    async del(key: string): Promise<number> {
        return this.client.del(key);
    }

    async onModuleDestroy() {
        await this.client.quit();
    }


}
