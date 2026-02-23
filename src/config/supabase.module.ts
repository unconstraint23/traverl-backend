import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service-role client: for DB operations (profiles, trips, etc.)
export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

// Anon client: for Supabase Auth (signUp, signInWithPassword)
export const SUPABASE_AUTH_CLIENT = 'SUPABASE_AUTH_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: (configService: ConfigService): SupabaseClient => {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const supabaseKey = configService.get<string>('SUPABASE_KEY'); // service_role key
        return createClient(supabaseUrl, supabaseKey);
      },
      inject: [ConfigService],
    },
    {
      provide: SUPABASE_AUTH_CLIENT,
      useFactory: (configService: ConfigService): SupabaseClient => {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const supabaseAnonKey = configService.get<string>('SUPABASE_ANON_KEY'); // anon/public key
        return createClient(supabaseUrl, supabaseAnonKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: [SUPABASE_CLIENT, SUPABASE_AUTH_CLIENT],
})
export class SupabaseModule {}
