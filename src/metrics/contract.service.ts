import { Injectable } from '@nestjs/common';
import { web3L2 } from '../shared/rpc/rpc.provider';

@Injectable()
export class ContractService {
    async getVerifiedContractsCountLast24h(): Promise<number> {
        const now = Math.floor(Date.now() / 1000);
        const zks = (web3L2 as any).zks;
        const latestBatch = await zks.getL1BatchNumber();
        let startBatch = latestBatch;

        // Find batch ~24h ago
        for (let i = latestBatch; i >= 0; i--) {
            try {
                const range = await zks.getL1BatchBlockRange(i);
                const block = await web3L2.eth.getBlock(Number(range[0]));
                if (block.timestamp && now - Number(block.timestamp) >= 86400) {
                    startBatch = i;
                    break;
                }
            } catch {
                continue;
            }
        }

        const startRange = await zks.getL1BatchBlockRange(startBatch);
        const endRange = await zks.getL1BatchBlockRange(latestBatch);
        const fromBlock = Number(startRange[0]);
        const toBlock = Number(endRange[1]);

        const contractAddresses = new Set<string>();

        for (let i = fromBlock; i <= toBlock; i++) {
            const block = await web3L2.eth.getBlock(i, true);
            for (const tx of block.transactions) {
                if (typeof tx !== 'string') {
                    if (!tx.to) {
                        const receipt = await web3L2.eth.getTransactionReceipt(tx.hash);
                        if (receipt.contractAddress) {
                            contractAddresses.add(receipt.contractAddress.toLowerCase());
                        }
                    }
                }
            }

        }

        // Filter to count only contracts with bytecode (deployed)
        let verifiedCount = 0;

        for (const address of contractAddresses) {
            const code = await web3L2.eth.getCode(address);
            if (code && code !== '0x') {
                verifiedCount++;
            }
        }

        return verifiedCount;
    }
}
