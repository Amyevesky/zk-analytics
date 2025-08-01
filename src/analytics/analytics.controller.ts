import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
// import { RedisService } from 'src/redis/redis.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('ping')
    async pingRedis(): Promise<string> {
        return await this.analyticsService.ping(); // should return "PONG"
    }
    @Get('avg-block-time')
    async getAvgBlockTime() {
        const avg = await this.analyticsService.getAvgBlockTime();
        return { avgBlockTime: avg };
    }

    @Get('daily-tx-count')
    async getDailyTransactionCount() {
        const txCount = await this.analyticsService.getDailyTransactionCount();
        return { dailyTxCount: txCount };
    }

    @Get('token-transfers')
    async getTokenTransfers() {
        const count = await this.analyticsService.getTokenTransferCount();
        return { tokenTransfersLast24h: count };
    }

    @Get('internal-txs')
    async getInternalTxs() {
        const count = await this.analyticsService.getInternalTxCount();
        return { internalTransactionsLast24h: count };
    }

    @Get('verified-contracts')
    async getVerifiedContracts() {
        const count = await this.analyticsService.getVerifiedContractCount();
        return { verifiedContractsLast24h: count };
    }

    @Get('top-accounts')
    async getTopAccounts() {
        const accounts = await this.analyticsService.getTopAccounts();
        return { topAccounts: accounts };
    }

    @Get('total-addresses')
    async getTotalAddresses() {
        const count = await this.analyticsService.getTotalAddresses();
        return { totalActiveAddresses: count };
    }
    // More endpoints will be added here.
}
