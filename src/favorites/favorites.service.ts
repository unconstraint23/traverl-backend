import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { I18nService, Lang } from '../i18n';

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly i18n: I18nService,
  ) {}

  async add(userId: string, tripId: string, lang: Lang = 'en') {
    const { data: existing } = await this.supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('trip_id', tripId)
      .single();

    if (existing) {
      return { message: this.i18n.t('favorites.already_favorited', lang) };
    }

    const { data, error } = await this.supabase
      .from('favorites')
      .insert({ user_id: userId, trip_id: tripId })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async remove(userId: string, tripId: string, lang: Lang = 'en') {
    const { error } = await this.supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('trip_id', tripId);

    if (error) throw error;
    return { message: this.i18n.t('favorites.removed', lang) };
  }

  async list(userId: string) {
    const { data, error } = await this.supabase
      .from('favorites')
      .select(`
        *,
        trips:trip_id (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async isFavorited(userId: string, tripId: string) {
    const { data } = await this.supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('trip_id', tripId)
      .single();

    return { favorited: !!data };
  }
}
