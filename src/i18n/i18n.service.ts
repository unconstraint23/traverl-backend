import { Injectable } from '@nestjs/common';
import * as en from './en.json';
import * as zh from './zh.json';

export type Lang = 'en' | 'zh';

const translations: Record<Lang, any> = { en, zh };

@Injectable()
export class I18nService {
  /**
   * Translate a dot-notation key, e.g. 'auth.invalid_credentials'
   */
  t(key: string, lang: Lang = 'en'): string {
    const dict = translations[lang] || translations.en;
    const parts = key.split('.');
    let result: any = dict;

    for (const part of parts) {
      result = result?.[part];
      if (result === undefined) break;
    }

    // Fallback to English if key not found in target language
    if (result === undefined) {
      result = translations.en;
      for (const part of parts) {
        result = result?.[part];
        if (result === undefined) break;
      }
    }

    return result ?? key;
  }

  /**
   * Parse Accept-Language header to get preferred language
   */
  static parseLang(acceptLanguage?: string): Lang {
    if (!acceptLanguage) return 'en';
    const primary = acceptLanguage.split(',')[0].trim().toLowerCase();
    if (primary.startsWith('zh')) return 'zh';
    return 'en';
  }
}
