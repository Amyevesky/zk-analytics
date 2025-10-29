import { Injectable, Logger } from '@nestjs/common';
import { web3L2 } from '../shared/rpc/rpc.provider';
import pLimit from 'p-limit';
import { RedisService } from 'src/shared/redis/redis.service';

@Injectable()
export class BlockService {
    constructor(
        private readonly redisService: RedisService,
    ) { }
    private readonly logger = new Logger(BlockService.name);

    // async getAvgBlockTime(blocksToCheck = 30): Promise<number> {
    //     try {
    //         const latest = await web3L2.eth.getBlockNumber(); // bigint
    //         const fromBlock = latest >= BigInt(blocksToCheck) ? latest - BigInt(blocksToCheck) : 1n;

    //         const limit = pLimit(10); // increase concurrency

    //         // Prefetch all needed blocks (no overlap)
    //         const blockNumbers: bigint[] = [];
    //         for (let i = fromBlock; i <= latest; i++) {
    //             blockNumbers.push(i);
    //         }

    //         const blockFetchTasks = blockNumbers.map(blockNum =>
    //             limit(() => web3L2.eth.getBlock(blockNum))
    //         );

    //         const blocks = await Promise.all(blockFetchTasks);
    //         const timestamps: bigint[] = blocks
    //             .filter(b => b && b.timestamp !== undefined)
    //             .map(b => BigInt(b.timestamp.toString()))
    //             .filter(ts => ts > 1000000000n); // valid timestamp

    //         const timeDiffs: number[] = [];
    //         for (let i = 1; i < timestamps.length; i++) {
    //             timeDiffs.push(Number(timestamps[i] - timestamps[i - 1]));
    //         }

    //         if (timeDiffs.length === 0) {
    //             this.logger.warn('No valid block timestamps found.');
    //             return 0;
    //         }

    //         const total = timeDiffs.reduce((sum, val) => sum + val, 0);
    //         const avg = total / timeDiffs.length;

    //         return Math.round(avg * 100) / 100;
    //     } catch (error) {
    //         this.logger.error('Failed to calculate average block time', error);
    //         return 0;
    //     }
    // }

    // async getAvgBlockTime(blocksToCheck = 40): Promise<number> {
    //     const cacheKey = `avgBlockTime:${blocksToCheck}`;

    //     try {
    //         // 1. Check Redis cache
    //         const cached = await this.redisService.get(cacheKey);
    //         if (cached) {
    //             return parseFloat(cached);
    //         }
    //         const zksync = (web3L2 as any).ZKsync;
    //         const latest = await zksync.L2.eth.getBlockNumber();
    //         // const latest = await web3L2.eth.getBlockNumber(); // bigint
    //         const fromBlock = latest >= BigInt(blocksToCheck) ? latest - BigInt(blocksToCheck) : 1n;

    //         const limit = pLimit(10); // increase concurrency

    //         // 2. Prefetch block range
    //         const blockNumbers: bigint[] = [];
    //         for (let i = fromBlock; i <= latest; i++) {
    //             blockNumbers.push(i);
    //         }

    //         const blockFetchTasks = blockNumbers.map(blockNum =>
    //             limit(() => zksync.L2.eth.getBlock(blockNum))
    //         );

    //         const blocks = await Promise.all(blockFetchTasks);

    //         const timestamps: bigint[] = blocks
    //             .filter(b => b && b.timestamp !== undefined)
    //             .map(b => BigInt(b.timestamp.toString()))
    //             .filter(ts => ts > 1000000000n); // valid timestamps

    //         const timeDiffs: number[] = [];
    //         for (let i = 1; i < timestamps.length; i++) {
    //             timeDiffs.push(Number(timestamps[i] - timestamps[i - 1]));
    //         }

    //         if (timeDiffs.length === 0) {
    //             this.logger.warn('No valid block timestamps found.');
    //             return 0;
    //         }

    //         const total = timeDiffs.reduce((sum, val) => sum + val, 0);
    //         const avg = total / timeDiffs.length;
    //         const result = Math.round(avg * 100) / 100;

    //         // 3. Cache result in Redis (expires in 15 min)
    //         await this.redisService.set(cacheKey, result.toString(), { EX: 1800 });

    //         return result;
    //     } catch (error) {
    //         this.logger.error('Failed to calculate average block time', error);
    //         return 0;
    //     }
    // }

    async getAvgBlockTime(blocksToCheck = 30): Promise<number> {
        const cacheKey = `avgBlockTime:${blocksToCheck}`;

        try {
            // 1. Check Redis cache
            const cached = await this.redisService.get(cacheKey);
            if (cached) {
                this.logger.log(`Returning cached avg block time: ${cached}s`);
                return parseFloat(cached);
            }

            const zksync = (web3L2 as any).ZKsync;
            const latest = await zksync.L2.eth.getBlockNumber();
            const fromBlock = latest >= BigInt(blocksToCheck) ? latest - BigInt(blocksToCheck) : 1n;

            const limit = pLimit(10); // concurrency limit
            const blockNumbers: bigint[] = [];

            for (let i = fromBlock; i <= latest; i++) {
                blockNumbers.push(i);
            }

            // 2. Fetch block data concurrently with retry/safety
            const blockFetchTasks = blockNumbers.map(blockNum =>
                limit(async () => {
                    try {
                        const block = await zksync.L2.eth.getBlock(blockNum);
                        if (!block || !block.timestamp) {
                            this.logger.warn(`Block ${blockNum.toString()} is invalid.`);
                            return null;
                        }
                        return block;
                    } catch (err) {
                        this.logger.warn(`Error fetching block ${blockNum.toString()}: ${err.message}`);
                        return null;
                    }
                })
            );

            const blocks = await Promise.all(blockFetchTasks);
            const validBlocks = blocks.filter(b => b && b.timestamp !== undefined);

            const timestamps: bigint[] = validBlocks
                .map(b => BigInt(b.timestamp.toString()))
                .filter(ts => ts > 1000000000n); // filter out invalid/unrealistic timestamps

            // Log block timestamps
            this.logger.log(`Collected ${timestamps.length} valid block timestamps:`);
            timestamps.forEach((ts, i) => {
                this.logger.log(`Block ${blockNumbers[i]?.toString()}: Timestamp ${ts.toString()}`);
            });

            // 3. Calculate time differences
            const timeDiffs: number[] = [];
            for (let i = 1; i < timestamps.length; i++) {
                const diff = Number(timestamps[i] - timestamps[i - 1]);
                if (diff > 0 && diff < 600) { // skip negative/abnormal differences
                    timeDiffs.push(diff);
                }
            }

            if (timeDiffs.length === 0) {
                this.logger.warn('No valid block time differences found.');
                return 0;
            }

            // 4. Median instead of average
            const sortedDiffs = timeDiffs.sort((a, b) => a - b);
            const median = sortedDiffs[Math.floor(sortedDiffs.length / 2)];
            const result = Math.round(median * 100) / 100;

            this.logger.log(`Calculated median block time: ${result}s`);

            // 5. Cache result in Redis (15 min)
            await this.redisService.set(cacheKey, result.toString(), { EX: 1800 });

            return result;
        } catch (error) {
            this.logger.error('Failed to calculate average block time', error);
            return 0;
        }
    }


}
