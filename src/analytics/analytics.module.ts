import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

import { BlockService } from 'src/metrics/block.service';
import { TxService } from 'src/metrics/tx.service';
import { TokenService } from 'src/metrics/token.service';
import { ContractService } from 'src/metrics/contract.service';
import { AccountService } from 'src/metrics/account.service';
import { MetricsModule } from 'src/metrics/matrics.module';
// import { RedisService } from 'src/redis/redis.service';


@Module({
    imports: [MetricsModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService, BlockService, TxService, TokenService, ContractService, AccountService],
})
export class AnalyticsModule { }
