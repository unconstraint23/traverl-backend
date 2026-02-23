import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { SUPABASE_CLIENT } from '../config/supabase.module';

@Injectable()
export class FoursquareService {
  private readonly logger = new Logger(FoursquareService.name);
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {
    this.apiKey = this.configService.get<string>('GEOAPIFY_API_KEY');
  }

  /**
   * Search places near a destination (with caching)
   * Uses Geoapify Places API (free 3000 req/day)
   */
  async searchPlaces(params: {
    query?: string;
    near: string;
    categories?: string;
    limit?: number;
  }): Promise<any[]> {
    const { near, query, limit = 10 } = params;

    // 1. Check cache first
    const cached = await this.getCachedPlaces(near, query);
    if (cached && cached.length > 0) {
      this.logger.log(`Cache hit: ${cached.length} places for "${near}"`);
      return cached;
    }

    // 2. Geocode city name → coordinates
    const coords = await this.geocodeCity(near);
    if (!coords) {
      this.logger.warn(`Could not geocode "${near}", skipping POI search`);
      return [];
    }

    // 3. Call Geoapify Places API
    try {
      const categories = this.mapCategory(params.categories) || 'tourism.sights,catering,entertainment';

      const response = await axios.get('https://api.geoapify.com/v2/places', {
        params: {
          categories,
          filter: `circle:${coords.lon},${coords.lat},5000`,
          bias: `proximity:${coords.lon},${coords.lat}`,
          limit,
          apiKey: this.apiKey,
        },
        timeout: 15000,
      });

      const features = response.data.features || [];
      const places = this.transformPlaces(features, near);

      // 4. Cache results
      if (places.length > 0) {
        await this.cachePlaces(places, near);
      }

      this.logger.log(`Geoapify API: ${places.length} places for "${near}"`);
      return places;
    } catch (error) {
      this.logger.error(`Geoapify API error: ${error.message}`);
      const fallback = await this.getCachedPlaces(near, query, true);
      return fallback || [];
    }
  }

  /**
   * Geocode a city/destination name to lat/lon using Geoapify
   */
  private async geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const response = await axios.get('https://api.geoapify.com/v1/geocode/search', {
        params: {
          text: city,
          limit: 1,
          apiKey: this.apiKey,
        },
        timeout: 15000,
      });

      const feature = response.data.features?.[0];
      if (!feature) return null;

      return {
        lat: feature.properties.lat,
        lon: feature.properties.lon,
      };
    } catch (error) {
      this.logger.error(`Geocoding error for "${city}": ${error.message}`);
      return null;
    }
  }

  /**
   * Get places for specific activities in an itinerary
   */
  async enrichActivities(
    destination: string,
    activities: Array<{ name: string; category?: string }>,
  ): Promise<Array<{ name: string; category?: string; place?: any }>> {
    const enriched = [];

    for (const activity of activities) {
      try {
        const places = await this.searchPlaces({
          query: activity.name,
          near: destination,
          categories: activity.category,
          limit: 1,
        });

        enriched.push({
          ...activity,
          place: places[0] || null,
        });
      } catch {
        enriched.push({ ...activity, place: null });
      }
    }

    return enriched;
  }

  /**
   * Check cache for places
   */
  private async getCachedPlaces(
    city: string,
    query?: string,
    includeExpired = false,
  ): Promise<any[] | null> {
    let queryBuilder = this.supabase
      .from('places_cache')
      .select('*')
      .ilike('city', `%${city}%`);

    if (!includeExpired) {
      queryBuilder = queryBuilder.gt('expires_at', new Date().toISOString());
    }

    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    const { data, error } = await queryBuilder.limit(20);

    if (error) {
      this.logger.error(`Cache read error: ${error.message}`);
      return null;
    }

    return data && data.length > 0 ? data : null;
  }

  /**
   * Cache places to database
   */
  private async cachePlaces(places: any[], city: string): Promise<void> {
    const records = places.map((place) => ({
      fsq_id: place.place_id || `geo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: place.name,
      address: place.address || '',
      latitude: place.latitude || null,
      longitude: place.longitude || null,
      category: place.category || 'General',
      rating: null,
      photos: JSON.stringify([]),
      city,
      country: place.country || '',
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { error } = await this.supabase
      .from('places_cache')
      .upsert(records, { onConflict: 'fsq_id' });

    if (error) {
      this.logger.error(`Cache write error: ${error.message}`);
    }
  }

  /**
   * Transform Geoapify GeoJSON features to our place format
   */
  private transformPlaces(features: any[], city: string): any[] {
    return features
      .filter((f: any) => f.properties?.name)
      .map((f: any) => ({
        place_id: f.properties.place_id || `geo_${Math.random().toString(36).slice(2, 10)}`,
        name: f.properties.name,
        address: f.properties.formatted || f.properties.address_line1 || '',
        latitude: f.properties.lat,
        longitude: f.properties.lon,
        category: f.properties.categories?.[0]?.replace('.', ' > ') || 'General',
        country: f.properties.country || '',
        city,
      }));
  }

  /**
   * Map itinerary category to Geoapify category strings
   */
  private mapCategory(category?: string): string | undefined {
    if (!category) return undefined;

    const categoryMap: Record<string, string> = {
      sightseeing: 'tourism.sights',
      food: 'catering.restaurant,catering.cafe',
      culture: 'entertainment.museum,entertainment.culture',
      nature: 'natural,tourism.attraction',
      shopping: 'commercial.shopping_mall,commercial.marketplace',
      entertainment: 'entertainment,leisure',
    };

    return categoryMap[category.toLowerCase()] || undefined;
  }
}
