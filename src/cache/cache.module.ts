import { Module } from '@nestjs/common';
import { CacheRefreshService } from './cache-refresh.service';

@Module({
  providers: [CacheRefreshService],
  exports: [CacheRefreshService],
})
export class CacheRefreshModule {}
