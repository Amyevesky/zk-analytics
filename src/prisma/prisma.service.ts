import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
       let retries = 5;
       while (retries) {
           try {
        await this.$connect();
          break;
      } catch (err) {
          console.log('Retrying database connection in 5 seconds...');
          retries -= 1;
          await new Promise(res => setTimeout(res, 5000));
      }
  }
   }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
