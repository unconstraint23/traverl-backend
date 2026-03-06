import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { DeepseekService } from '../deepseek/deepseek.service';
import { FoursquareService } from '../foursquare/foursquare.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { I18nService, Lang } from '../i18n';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  /**
   * 旅行目的地封面图映射（真实可用的 Unsplash 图片链接）
   * 匹配关键词 -> 图片 URL
   */
  private static readonly DESTINATION_IMAGES: Record<string, string> = {
    // 亚洲
    '东京': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1920&auto=format&fit=crop',
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1920&auto=format&fit=crop',
    '京都': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop',
    'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop',
    '巴厘岛': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2038&auto=format&fit=crop',
    'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2038&auto=format&fit=crop',
    '曼谷': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1920&auto=format&fit=crop',
    'bangkok': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1920&auto=format&fit=crop',
    '新加坡': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1920&auto=format&fit=crop',
    'singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1920&auto=format&fit=crop',
    '首尔': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?q=80&w=1920&auto=format&fit=crop',
    'seoul': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?q=80&w=1920&auto=format&fit=crop',
    '北京': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1920&auto=format&fit=crop',
    'beijing': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1920&auto=format&fit=crop',
    '上海': 'https://images.unsplash.com/photo-1537531383496-f4749b90c650?q=80&w=1920&auto=format&fit=crop',
    'shanghai': 'https://images.unsplash.com/photo-1537531383496-f4749b90c650?q=80&w=1920&auto=format&fit=crop',
    '香港': 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?q=80&w=1920&auto=format&fit=crop',
    'hong kong': 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?q=80&w=1920&auto=format&fit=crop',
    // 欧洲
    '巴黎': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop',
    'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop',
    '伦敦': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1920&auto=format&fit=crop',
    'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1920&auto=format&fit=crop',
    '罗马': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1920&auto=format&fit=crop',
    'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1920&auto=format&fit=crop',
    '圣托里尼': 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1929&auto=format&fit=crop',
    'santorini': 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1929&auto=format&fit=crop',
    '瑞士': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2070&auto=format&fit=crop',
    'switzerland': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2070&auto=format&fit=crop',
    'swiss alps': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2070&auto=format&fit=crop',
    '巴塞罗那': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1920&auto=format&fit=crop',
    'barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1920&auto=format&fit=crop',
    '阿姆斯特丹': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?q=80&w=1920&auto=format&fit=crop',
    'amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?q=80&w=1920&auto=format&fit=crop',
    '布拉格': 'https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=1920&auto=format&fit=crop',
    'prague': 'https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=1920&auto=format&fit=crop',
    '威尼斯': 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1920&auto=format&fit=crop',
    'venice': 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1920&auto=format&fit=crop',
    // 美洲
    '纽约': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1920&auto=format&fit=crop',
    'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1920&auto=format&fit=crop',
    '马丘比丘': 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=2076&auto=format&fit=crop',
    'machu picchu': 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=2076&auto=format&fit=crop',
    // 大洋洲
    '悉尼': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1920&auto=format&fit=crop',
    'sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1920&auto=format&fit=crop',
    // 非洲 & 中东
    '迪拜': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1920&auto=format&fit=crop',
    'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1920&auto=format&fit=crop',
    '开罗': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=1920&auto=format&fit=crop',
    'cairo': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=1920&auto=format&fit=crop',
  };

  /** 默认旅行封面图 */
  private static readonly DEFAULT_COVER =
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1920&auto=format&fit=crop';

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly deepseekService: DeepseekService,
    private readonly foursquareService: FoursquareService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * 根据目的地名称获取封面图 URL
   */
  private getCoverImage(destination: string): string {
    const key = destination.toLowerCase().trim();
    return TripsService.DESTINATION_IMAGES[key] || TripsService.DEFAULT_COVER;
  }

  async create(userId: string, dto: CreateTripDto, lang: Lang = 'en') {
    // 1. Generate AI itinerary (with cache) — pass language for AI prompt
    const itineraryData = await this.getOrGenerateItinerary(dto, lang);

    // 2. Enrich first day's activities with POI data
    if (itineraryData.days && itineraryData.days.length > 0) {
      await this.enrichItineraryWithPOI(dto.destination, itineraryData);
    }

    const title = dto.title || `${dto.destination}: A ${dto.duration}-Day ${dto.vibe} Trip`;
    const description = itineraryData.summary ||
      `An AI-curated ${dto.duration}-day ${dto.budget.toLowerCase()} ${dto.vibe.toLowerCase()} trip to ${dto.destination}.`;

    const { data, error } = await this.supabase
      .from('trips')
      .insert({
        user_id: userId,
        destination: dto.destination,
        duration: dto.duration,
        budget: dto.budget,
        vibe: dto.vibe,
        title,
        description,
        cover_image: this.getCoverImage(dto.destination),
        itinerary_data: itineraryData,
        status: 'generated',
      })
      .select('*')
      .single();

    if (error) throw error;

    return data;
  }

  async findAllByUser(userId: string) {
    this.logger.log(`findAllByUser - userId: ${userId}`);
    const { data, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`findAllByUser failed - userId: ${userId}, error: ${error.message}`);
      throw error;
    }
    this.logger.log(`findAllByUser success - userId: ${userId}, count: ${data?.length || 0}`);
    return data;
  }

  async findById(id: string, lang: Lang = 'en') {
    this.logger.log(`findById - id: ${id}, lang: ${lang}`);
    
    try {
      // First, try without the join to see if the trip exists
      const { data, error } = await this.supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (error) {
        this.logger.error(`findById database error: id=${id}, error=${error.message}, code=${error.code}`);
        throw error;
      }

      if (!data) {
        this.logger.warn(`findById not found: id=${id}`);
        throw new NotFoundException(this.i18n.t('trips.not_found', lang));
      }
      
      // Then fetch the user profile separately if needed
      if (data.user_id) {
        const { data: profile } = await this.supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', data.user_id)
          .maybeSingle();
        
        if (profile) {
          data.profiles = profile;
        }
      }
      
      this.logger.log(`findById success - id: ${id}, destination: ${data.destination}`);
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`findById unexpected error: id=${id}, error=${error.message}`);
      throw new NotFoundException(this.i18n.t('trips.not_found', lang));
    }
  }

  async findAll() {
    this.logger.log('findAll - fetching all trips');
    const { data, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('status', 'generated')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      this.logger.error(`findAll failed - error: ${error.message}`);
      throw error;
    }
    
    // Fetch user profiles for all trips
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(trip => trip.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await this.supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          data.forEach(trip => {
            if (trip.user_id && profileMap.has(trip.user_id)) {
              trip.profiles = profileMap.get(trip.user_id);
            }
          });
        }
      }
    }
    
    this.logger.log(`findAll success - count: ${data?.length || 0}`);
    return data;
  }

  // ============================================================
  // Private: Itinerary generation with caching
  // ============================================================

  private async getOrGenerateItinerary(dto: CreateTripDto, lang: Lang): Promise<any> {
    // Include language in cache key so zh and en itineraries are cached separately
    const cacheKey = `${dto.destination.toLowerCase().trim()}|${dto.duration}|${dto.budget.toLowerCase().trim()}|${dto.vibe.toLowerCase().trim()}|${lang}`;

    // Check cache
    const { data: cached } = await this.supabase
      .from('itinerary_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      await this.supabase
        .from('itinerary_cache')
        .update({ hit_count: (cached.hit_count || 0) + 1 })
        .eq('id', cached.id);

      this.logger.log(`Itinerary cache hit: "${cacheKey}" (hits: ${cached.hit_count + 1})`);
      return cached.itinerary_data;
    }

    // Generate new itinerary via DeepSeek — pass language
    this.logger.log(`Itinerary cache miss: "${cacheKey}", calling DeepSeek...`);
    const itineraryData = await this.deepseekService.generateItinerary({
      destination: dto.destination,
      duration: dto.duration,
      budget: dto.budget,
      vibe: dto.vibe,
      lang,
    });

    // Cache the result
    const { error: cacheError } = await this.supabase
      .from('itinerary_cache')
      .upsert(
        {
          cache_key: cacheKey,
          destination: dto.destination,
          duration: dto.duration,
          budget: dto.budget,
          vibe: dto.vibe,
          itinerary_data: itineraryData,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          hit_count: 0,
        },
        { onConflict: 'cache_key' },
      );

    if (cacheError) {
      this.logger.error(`Failed to cache itinerary: ${cacheError.message}`);
    }

    return itineraryData;
  }

  private async enrichItineraryWithPOI(destination: string, itinerary: any): Promise<void> {
    const daysToEnrich = Math.min(itinerary.days.length, 2);

    for (let i = 0; i < daysToEnrich; i++) {
      const day = itinerary.days[i];
      if (!day.activities || day.activities.length === 0) continue;

      const places = await this.foursquareService.searchPlaces({
        near: destination,
        query: day.activities[0]?.category || 'attractions',
        limit: 5,
      });

      for (let j = 0; j < day.activities.length && j < places.length; j++) {
        day.activities[j].place = places[j] || null;
      }
    }
  }
}
