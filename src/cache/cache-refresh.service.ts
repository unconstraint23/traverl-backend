import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';

@Injectable()
export class CacheRefreshService {
  private readonly logger = new Logger(CacheRefreshService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Run daily at 3:00 AM — clean up expired caches
   */
  @Cron('0 3 * * *')
  async handleCacheCleanup() {
    this.logger.log('Starting daily cache cleanup...');
    const now = new Date().toISOString();

    // Clean expired places cache
    const { data: expiredPlaces, error: placesError } = await this.supabase
      .from('places_cache')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (placesError) {
      this.logger.error(`Places cache cleanup error: ${placesError.message}`);
    } else {
      this.logger.log(`Cleaned ${expiredPlaces?.length || 0} expired places cache entries`);
    }

    // For itinerary cache: keep high-hit entries, delete low-hit expired ones
    // Delete expired itinerary caches with low hit count
    const { data: expiredLowHit, error: lowHitError } = await this.supabase
      .from('itinerary_cache')
      .delete()
      .lt('expires_at', now)
      .lt('hit_count', 5)
      .select('id');

    if (lowHitError) {
      this.logger.error(`Itinerary cache cleanup error: ${lowHitError.message}`);
    } else {
      this.logger.log(`Cleaned ${expiredLowHit?.length || 0} low-hit expired itinerary caches`);
    }

    // Refresh expired high-hit itinerary caches (extend expiry)
    const { data: expiredHighHit, error: highHitError } = await this.supabase
      .from('itinerary_cache')
      .update({
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .lt('expires_at', now)
      .gte('hit_count', 5)
      .select('id');

    if (highHitError) {
      this.logger.error(`Itinerary cache refresh error: ${highHitError.message}`);
    } else {
      this.logger.log(`Extended expiry for ${expiredHighHit?.length || 0} popular itinerary caches`);
    }

    this.logger.log('Daily cache cleanup completed');
  }

  /**
   * Manual trigger for cache statistics
   */
  async getCacheStats() {
    const { count: placesCount } = await this.supabase
      .from('places_cache')
      .select('*', { count: 'exact', head: true });

    const { count: itineraryCount } = await this.supabase
      .from('itinerary_cache')
      .select('*', { count: 'exact', head: true });

    const { count: expiredPlaces } = await this.supabase
      .from('places_cache')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString());

    const { count: expiredItinerary } = await this.supabase
      .from('itinerary_cache')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString());

    return {
      places_cache: { total: placesCount || 0, expired: expiredPlaces || 0 },
      itinerary_cache: { total: itineraryCount || 0, expired: expiredItinerary || 0 },
    };
  }
}
