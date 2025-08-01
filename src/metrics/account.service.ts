import { Injectable } from '@nestjs/common';
import { web3L2 } from '../shared/rpc/rpc.provider';

@Injectable()
export class AccountService {
    async getTopAccounts(limit = 10): Promise<{ address: string; balance: string }[]> {

        const zksync = (web3L2 as any).ZKsync;
        const latestBlock = await zksync.L2.eth.getBlockNumber();
        const now = Math.floor(Date.now() / 1000);

        // Find the block from ~24 hours ago
        // let startBlock = latestBlock;
        // for (let i = latestBlock; i >= 1; i--) {
        //     try {
        //         const block = await zksync.L2.eth.getBlock(i);
        //         if (block && block.timestamp && now - Number(block.timestamp) >= 86400) {
        //             startBlock = i;
        //             break;
        //         }
        //     } catch {
        //         continue;
        //     }
        // }

        const addressSet = new Set<string>();

        // Collect unique addresses from transactions
        for (let i = 1; i <= latestBlock; i++) {
            try {
                const block = await zksync.L2.eth.getBlock(i, true);
                for (const tx of block.transactions) {

                    if (typeof tx !== 'string') {
                        if (tx.from) addressSet.add(tx.from.toLowerCase());
                        if (tx.to) addressSet.add(tx.to.toLowerCase());
                    }
                }
            } catch {
                continue;
            }
        }

        // Fetch balances
        const accounts: { address: string; balance: string }[] = [];
        for (const address of addressSet) {
            try {
                const balance = await zksync.L2.eth.getBalance(address);
                if (balance > 0) accounts.push({ address, balance: balance.toString() });

            } catch {
                continue;
            }
        }

        // Sort by balance
        accounts.sort((a, b) => {
            const diff = BigInt(b.balance) - BigInt(a.balance);
            return diff > 0n ? 1 : diff < 0n ? -1 : 0;
        });
        return accounts.slice(0, limit);
    }


    async getTotalActiveAddresses(): Promise<number> {
        const zksync = (web3L2 as any).ZKsync;
        const latestBlock = await zksync.L2.eth.getBlockNumber();

        const addressSet = new Set<string>();

        for (let i = 1; i <= latestBlock; i++) {
            try {
                const block = await zksync.L2.eth.getBlock(i, true); // include txs
                for (const tx of block.transactions) {
                    if (typeof tx !== 'string') {
                        if (tx.from) {
                            const from = tx.from.toLowerCase();
                            if (!addressSet.has(from)) {
                                addressSet.add(from);
                                console.log("FROM:", from);
                            }
                        }
                        if (tx.to) {
                            const to = tx.to.toLowerCase();
                            if (!addressSet.has(to)) {
                                addressSet.add(to);
                                console.log("TO:", to);
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn(`Failed to fetch block ${i}:`, err.message);
                continue;
            }
        }

        return addressSet.size;
    }


}
