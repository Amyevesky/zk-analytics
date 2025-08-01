import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { web3L2 } from '../shared/rpc/rpc.provider';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnalyticsGateway } from 'src/analytics/analytics.gateway';
import Redis from 'ioredis';
import { RedisService } from 'src/shared/redis/redis.service';

@Injectable()
export class TxService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly analyticsGateway: AnalyticsGateway,
        private readonly redisService: RedisService,
    ) { }
    private readonly logger = new Logger(TxService.name);
    // async getDailyTransactionCount(): Promise<number> {
    //     try {
    //         console.log("Tx count endpoint hit");

    //         const today = new Date();
    //         today.setUTCHours(0, 0, 0, 0); // Normalize to midnight

    //         const zksync = (web3L2 as any).ZKsync;
    //         const now = Math.floor(Date.now() / 1000); // number

    //         const latestBlockNumber = Number(await zksync.L2.eth.getBlockNumber()); // Ensure number
    //         let totalTxs = 0;

    //         for (let i = latestBlockNumber; i >= 0; i--) {
    //             const block = await zksync.L2.eth.getBlock(i);
    //             if (!block?.timestamp) continue;

    //             const blockTimestamp = Number(block.timestamp); // Ensure number
    //             const ageInSeconds = now - blockTimestamp;

    //             if (ageInSeconds > 86400) break; // Stop if older than 24 hours

    //             const txCount = Number(await zksync.L2.eth.getBlockTransactionCount(i));
    //             totalTxs += txCount;
    //         }

    //         await this.prisma.dailyStats.upsert({
    //             where: { date: today },
    //             update: { txCount: totalTxs },
    //             create: { date: today, txCount: totalTxs },
    //         });

    //         this.analyticsGateway.emitTxCountUpdated(totalTxs);
    //         return totalTxs;
    //     } catch (error) {
    //         console.error('Error in getDailyTransactionCount:', error.message);
    //         return 0;
    //     }
    // }

    async getDailyTransactionCount(): Promise<number> {
        try {
            console.log("Tx count endpoint hit");

            const today = new Date();
            today.setUTCHours(0, 0, 0, 0); // Normalize to midnight
            const todayKey = `dailyTxCount:${today.toISOString().split('T')[0]}`;

            // 1. Try Redis cache
            const cached = await this.redisService.get(todayKey);
            if (cached) {
                return parseInt(cached, 10);
            }

            // 2. Compute value if not cached
            const zksync = (web3L2 as any).ZKsync;
            const now = Math.floor(Date.now() / 1000); // current UNIX timestamp
            const latestBlockNumber = Number(await zksync.L2.eth.getBlockNumber());
            let totalTxs = 0;

            for (let i = latestBlockNumber; i >= 0; i--) {
                const block = await zksync.L2.eth.getBlock(i);
                if (!block?.timestamp) continue;

                const blockTimestamp = Number(block.timestamp);
                const ageInSeconds = now - blockTimestamp;

                if (ageInSeconds > 86400) break; // older than 24 hours

                const txCount = Number(await zksync.L2.eth.getBlockTransactionCount(i));
                totalTxs += txCount;
            }

            // 3. Persist to DB and Redis
            await this.prisma.dailyStats.upsert({
                where: { date: today },
                update: { txCount: totalTxs },
                create: { date: today, txCount: totalTxs },
            });

            await this.redisService.set(todayKey, totalTxs.toString(), { EX: 86400 }); // Optionally add { EX: 86400 } to expire after 1 day

            this.analyticsGateway.emitTxCountUpdated(totalTxs);

            return totalTxs;
        } catch (error) {
            console.error('Error in getDailyTransactionCount:', error.message);
            return 0;
        }
    }


    async getInternalTransactionCountLast24h(): Promise<number> {
        const now = Math.floor(Date.now() / 1000);
        const zksync = (web3L2 as any).ZKsync;

        if (!zksync || !zksync.L2?.eth) {
            throw new Error('ZKsync plugin not initialized or missing L2');
        }

        const latestBlock = await zksync.L2.eth.getBlockNumber();
        let fromBlock = 1;

        // Find block from ~24h ago
        for (let i = latestBlock; i >= 0; i--) {
            try {
                const block = await zksync.L2.eth.getBlock(i);
                if (block?.timestamp && now - Number(block.timestamp) >= 86400) {
                    fromBlock = i;
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        let internalTxCount = 0;

        // Helper to call debug_traceBlockByNumber safely
        const traceBlock = async (blockNumberHex: string): Promise<any> => {
            return new Promise((resolve, reject) => {
                (web3L2.currentProvider as any).send(
                    {
                        jsonrpc: '2.0',
                        method: 'debug_traceBlockByNumber',
                        params: [blockNumberHex, {}],
                        id: Date.now(),
                    },
                    (err: any, res: any) => {
                        if (err) return reject(err);
                        resolve(res?.result);
                    }
                );
            });
        };

        // Walk through each block and count internal txs
        for (let i = fromBlock; i <= latestBlock; i++) {
            try {
                const blockHex = '0x' + i.toString(16);
                const traces = await traceBlock(blockHex);

                if (Array.isArray(traces)) {
                    traces.forEach((txTrace) => {
                        if (txTrace.result?.calls) {
                            internalTxCount += txTrace.result.calls.length;
                        }
                    });
                }
            } catch (err) {
                console.warn(`Error tracing block ${i}:`, err.message);
            }
        }

        return internalTxCount;
    }

}
