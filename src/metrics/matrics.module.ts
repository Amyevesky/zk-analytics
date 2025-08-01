// src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import { BlockService } from 'src/metrics/block.service';
import { TxService } from 'src/metrics/tx.service';
import { TokenService } from 'src/metrics/token.service';
import { ContractService } from 'src/metrics/contract.service';
import { AccountService } from 'src/metrics/account.service';
import { AnalyticsGateway } from 'src/analytics/analytics.gateway';
import { RedisService } from 'src/shared/redis/redis.service';

@Module({
    providers: [BlockService, TxService, TokenService, ContractService, AccountService, AnalyticsGateway, RedisService],
    exports: [BlockService, TxService, TokenService, ContractService, AccountService, AnalyticsGateway, RedisService], // 👈 needed by other modules
})
export class MetricsModule { }