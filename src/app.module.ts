import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsModule } from './analytics/analytics.module';
import { MetricsModule } from './metrics/matrics.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisService } from './shared/redis/redis.service';

@Module({
  imports: [AnalyticsModule, MetricsModule, PrismaModule],
  controllers: [AppController, AnalyticsController],
  providers: [AppService, AnalyticsService, RedisService],
})
export class AppModule { }
