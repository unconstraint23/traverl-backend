import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ThirdPartyLoginDto } from './dto/auth.dto';
import { I18nService, Lang } from '../i18n';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() dto: RegisterDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.authService.register(dto, lang);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.authService.login(dto, lang);
  }

  @Post('third-party')
  @HttpCode(HttpStatus.OK)
  async thirdPartyLogin(
    @Body() dto: ThirdPartyLoginDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.authService.thirdPartyLogin(dto, lang);
  }
}
