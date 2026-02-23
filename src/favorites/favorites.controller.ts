import { Controller, Get, Post, Delete, Param, Req, UseGuards, Headers } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '../auth/auth.guard';
import { I18nService } from '../i18n';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async list(@Req() req: any) {
    return this.favoritesService.list(req.userId);
  }

  @Post(':tripId')
  async add(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.favoritesService.add(req.userId, tripId, lang);
  }

  @Delete(':tripId')
  async remove(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.favoritesService.remove(req.userId, tripId, lang);
  }

  @Get(':tripId/check')
  async isFavorited(@Req() req: any, @Param('tripId') tripId: string) {
    return this.favoritesService.isFavorited(req.userId, tripId);
  }
}
