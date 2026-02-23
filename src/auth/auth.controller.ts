import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ThirdPartyLoginDto } from './dto/auth.dto';
import { I18nService, Lang } from '../i18n';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.authService.register(dto, lang);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.authService.login(dto, lang);
  }

  @Post('third-party')
  async thirdPartyLogin(
    @Body() dto: ThirdPartyLoginDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.authService.thirdPartyLogin(dto, lang);
  }
}
