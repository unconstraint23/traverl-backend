import { Injectable, Inject, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { RegisterDto, LoginDto, ThirdPartyLoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // Email Auth — uses Supabase built-in Auth + profiles table
  // ============================================================

  async register(dto: RegisterDto) {
    // 1. Register in Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (authError) {
      if (authError.message?.includes('already registered')) {
        throw new ConflictException('Email already registered');
      }
      throw new InternalServerErrorException(authError.message);
    }

    if (!authData.user) {
      throw new InternalServerErrorException('Failed to create auth user');
    }

    // 2. Create profile record linked to Supabase auth user
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
      // Rollback: delete the auth user if profile creation fails
      await this.supabase.auth.admin.deleteUser(authData.user.id);
      throw new InternalServerErrorException('Failed to create user profile');
    }

    const token = this.generateToken(profile.id);
    return { user: profile, token };
  }

  async login(dto: LoginDto) {
    // 1. Authenticate via Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (authError) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Find profile by Supabase auth user id
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id, email, name, avatar_url, bio, auth_provider, created_at')
      .eq('auth_provider', 'email')
      .eq('provider_user_id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found');
    }

    const token = this.generateToken(profile.id);
    return { user: profile, token };
  }

  // ============================================================
  // Third-Party Auth — uses custom profiles table directly
  // ============================================================

  async thirdPartyLogin(dto: ThirdPartyLoginDto) {
    // 1. Look for existing profile with this provider + provider_user_id
    const { data: existing } = await this.supabase
      .from('profiles')
      .select('id, email, name, avatar_url, bio, auth_provider, created_at')
      .eq('auth_provider', dto.provider)
      .eq('provider_user_id', dto.provider_user_id)
      .single();

    if (existing) {
      // Existing user — return token
      const token = this.generateToken(existing.id);
      return { user: existing, token };
    }

    // 2. New user — create profile
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
      throw new InternalServerErrorException('Failed to create user profile');
    }

    const token = this.generateToken(profile.id);
    return { user: profile, token };
  }

  // ============================================================
  // Token utilities — shared by both auth flows
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
