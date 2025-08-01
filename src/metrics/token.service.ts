import { Injectable, NotFoundException } from '@nestjs/common';
import { web3L2 } from '../shared/rpc/rpc.provider';
import { AbiItem } from 'web3-utils';
import { log } from 'console';

@Injectable()
export class TokenService {
    private readonly TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // Transfer(address,address,uint256)

    // async getTokenTransferCountLast24h(): Promise<number> {
    //     try {
    //         const now = Math.floor(Date.now() / 1000);
    //         const zksync = (web3L2 as any).ZKsync;

    //         const latestBatch = await zksync.L2.getL1BatchNumber(); // ✅ Correct method
    //         let startBatch = latestBatch;

    //         for (let i = latestBatch; i >= 0; i--) {
    //             try {
    //                 const range = await zksync.L2.getL1BatchBlockRange(i);
    //                 const block = await zksync.L2.eth.getBlock(Number(range[0]));

    //                 if (block.timestamp && now - Number(block.timestamp) >= 86400) {
    //                     startBatch = i;
    //                     break;
    //                 }
    //             } catch (err) {
    //                 console.warn(`Error reading batch ${i}`, err.message);
    //                 continue;
    //             }
    //         }

    //         const startRange = await zksync.L2.getL1BatchBlockRange(startBatch);
    //         const endRange = await zksync.L2.getL1BatchBlockRange(latestBatch);

    //         const fromBlock = Number(startRange[0]);
    //         const toBlock = Number(endRange[1]);

    //         const logs = await zksync.L2.eth.getPastLogs({
    //             fromBlock,
    //             toBlock,
    //             topics: [this.TRANSFER_TOPIC],
    //         });

    //         return logs.length;
    //     } catch (err) {
    //         console.error('Error in getTokenTransferCountLast24h:', err.message);
    //         return 0;
    //     }
    // }

    private readonly ERC20_ABI: AbiItem[] = [
        {
            type: 'event',
            name: 'Transfer',
            inputs: [
                { type: 'address', name: 'from', indexed: true },
                { type: 'address', name: 'to', indexed: true },
                { type: 'uint256', name: 'value', indexed: false },
            ],
            anonymous: false,
        },
    ];
    async getTokenTransfersPaginated(page = 1, limit = 20): Promise<any[]> {
        const zksync = (web3L2 as any).ZKsync;
        const latest = await zksync.L2.eth.getBlockNumber();
        const fromBlock = 1;
        const toBlock = latest;

        log(`Fetching token transfers from blocks ${fromBlock} to ${toBlock} with page ${page} and limit ${limit}`);

        const logs = await zksync.L2.eth.getPastLogs({
            fromBlock,
            toBlock,
            topics: [this.TRANSFER_TOPIC],
        });


        const paginated = logs.slice((page - 1) * limit, page * limit);

        const decodedTransfers = await Promise.all(
            paginated.map(async (log) => {
                const decoded = web3L2.eth.abi.decodeLog(
                    this.ERC20_ABI[0].inputs!,
                    log.data,
                    log.topics.slice(1)
                ) as unknown as { from: string; to: string; value: string };

                const from = decoded.from.toLowerCase();
                const to = decoded.to.toLowerCase();
                const value = BigInt(decoded.value.toString());

                console.log(`Decoded transfer: from ${from}, to ${to}, value ${value}`);
                const systemAddresses = new Set([
                    '0x0000000000000000000000000000000000008001',
                    '0x000000000000000000000000000000000000800a',
                ]);

                // Apply basic filters
                const isSelfTransfer = from === to;
                const isZeroValue = value === 0n;
                const isSystemToSystem = systemAddresses.has(from) && systemAddresses.has(to);

                if (!isSelfTransfer || !isZeroValue || !isSystemToSystem) {
                    const block = await zksync.L2.eth.getBlock(log.blockNumber);
                    const ageSeconds = Math.floor(Date.now() / 1000) - Number(block.timestamp);

                    return {
                        txHash: log.transactionHash,
                        blockNumber: Number(log.blockNumber), // Make sure this isn't a BigInt
                        age: `${Math.floor(ageSeconds / 60)} mins ago`,
                        from: decoded.from,
                        to: decoded.to,
                        amount: web3L2.utils.fromWei(decoded.value.toString(), 'ether'), // Converted to string safely
                        token: log.address,
                    };

                }
                else {
                    throw new NotFoundException(`No valid token transfers found in the last 24 hours.`);
                }


            })
        );

        return decodedTransfers;
    }
}
