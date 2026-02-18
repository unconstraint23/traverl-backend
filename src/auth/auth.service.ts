import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const { data: existing } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        email: dto.email,
        password_hash: passwordHash,
        name: dto.name,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(dto.name)}&background=2badee&color=fff`,
      })
      .select('id, email, name, avatar_url')
      .single();

    if (error) throw error;

    const token = this.generateToken(user.id);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .single();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id);
    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

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
