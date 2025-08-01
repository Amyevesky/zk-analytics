import { Injectable } from '@nestjs/common';
import { BlockService } from 'src/metrics/block.service';
import { TxService } from 'src/metrics/tx.service';
import { TokenService } from 'src/metrics/token.service';
import { ContractService } from 'src/metrics/contract.service';
import { AccountService } from 'src/metrics/account.service';
import { RedisService } from 'src/shared/redis/redis.service';

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly blockService: BlockService,
        private readonly txService: TxService,
        private readonly tokenService: TokenService,
        private readonly contractService: ContractService,
        private readonly accountService: AccountService,
        private readonly redisService: RedisService,
    ) { }

    async getAvgBlockTime(): Promise<number> {
        return this.blockService.getAvgBlockTime();
    }
    async ping(): Promise<string> {
        return this.redisService.ping(); // Assuming ping is implemented in BlockService
    }
    async getDailyTransactionCount(): Promise<number> {
        return this.txService.getDailyTransactionCount();
    }

    async getTokenTransferCount(page = 1, limit = 20): Promise<any[]> {
        return this.tokenService.getTokenTransfersPaginated(page, limit);
    }

    async getInternalTxCount(): Promise<number> {
        return this.txService.getInternalTransactionCountLast24h();
    }

    async getVerifiedContractCount(): Promise<number> {
        return this.contractService.getVerifiedContractsCountLast24h();
    }

    async getTopAccounts(): Promise<{ address: string; balance: string }[]> {
        return this.accountService.getTopAccounts();
    }

    async getTotalAddresses(): Promise<number> {
        return this.accountService.getTotalActiveAddresses();
    }

}
