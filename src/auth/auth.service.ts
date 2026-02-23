import { Injectable, Inject, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import { SUPABASE_CLIENT, SUPABASE_AUTH_CLIENT } from '../config/supabase.module';
import { RegisterDto, LoginDto, ThirdPartyLoginDto } from './dto/auth.dto';
import { I18nService, Lang } from '../i18n';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(SUPABASE_AUTH_CLIENT) private readonly supabaseAuth: SupabaseClient,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  // ============================================================
  // Email Auth — uses Supabase built-in Auth + profiles table
  // ============================================================

  async register(dto: RegisterDto, lang: Lang = 'en') {
    // 1. Register in Supabase Auth (must use anon client)
    const { data: authData, error: authError } = await this.supabaseAuth.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (authError) {
      if (authError.message?.includes('already registered')) {
        throw new ConflictException(this.i18n.t('auth.email_already_registered', lang));
      }
      throw new InternalServerErrorException(authError.message);
    }

    if (!authData.user) {
      throw new InternalServerErrorException(this.i18n.t('auth.failed_create_auth_user', lang));
    }

    // 2. Create profile record in DB (use service_role client)
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        email: dto.email,
        name: dto.name,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(dto.name)}&background=2badee&color=fff`,
        auth_provider: 'email',
        provider_user_id: authData.user.id,
      })
      .select('id, email, name, avatar_url, auth_provider, created_at')
      .single();

    if (profileError) {
      await this.supabase.auth.admin.deleteUser(authData.user.id);
      throw new InternalServerErrorException(this.i18n.t('auth.failed_create_profile', lang));
    }

    const token = this.generateToken(profile.id);
    return { user: profile, token };
  }

  async login(dto: LoginDto, lang: Lang = 'en') {
    // 1. Authenticate via Supabase Auth (must use anon client)
    const { data: authData, error: authError } = await this.supabaseAuth.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (authError) {
      throw new UnauthorizedException(this.i18n.t('auth.invalid_credentials', lang));
    }

    // 2. Find profile in DB (use service_role client)
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id, email, name, avatar_url, bio, auth_provider, created_at')
      .eq('auth_provider', 'email')
      .eq('provider_user_id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException(this.i18n.t('auth.user_profile_not_found', lang));
    }

    const token = this.generateToken(profile.id);
    return { user: profile, token };
  }

  // ============================================================
  // Third-Party Auth — uses custom profiles table directly
  // ============================================================

  async thirdPartyLogin(dto: ThirdPartyLoginDto, lang: Lang = 'en') {
    const { data: existing } = await this.supabase
      .from('profiles')
      .select('id, email, name, avatar_url, bio, auth_provider, created_at')
      .eq('auth_provider', dto.provider)
      .eq('provider_user_id', dto.provider_user_id)
      .single();

    if (existing) {
      const token = this.generateToken(existing.id);
      return { user: existing, token };
    }

    const { data: profile, error } = await this.supabase
      .from('profiles')
      .insert({
        email: dto.email || null,
        name: dto.name,
        avatar_url: dto.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(dto.name)}&background=2badee&color=fff`,
        auth_provider: dto.provider,
        provider_user_id: dto.provider_user_id,
      })
      .select('id, email, name, avatar_url, auth_provider, created_at')
      .single();

    if (error) {
      throw new InternalServerErrorException(this.i18n.t('auth.failed_create_profile', lang));
    }

    const token = this.generateToken(profile.id);
    return { user: profile, token };
  }

  // ============================================================
  // Token utilities
  // ============================================================

  private generateToken(userId: string): string {
    return jwt.sign(
      { sub: userId },
      this.configService.get<string>('JWT_SECRET'),
      { expiresIn: '7d' },
    );
  }

  verifyToken(token: string): { sub: string } {
    return jwt.verify(
      token,
      this.configService.get<string>('JWT_SECRET'),
    ) as { sub: string };
  }
}
