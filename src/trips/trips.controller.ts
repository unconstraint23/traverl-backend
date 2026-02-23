import { Controller, Get, Post, Body, Param, Req, UseGuards, Headers } from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { I18nService } from '../i18n';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() req: any,
    @Body() dto: CreateTripDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.tripsService.create(req.userId, dto, lang);
  }

  @Get()
  async findAll() {
    return this.tripsService.findAll();
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  async findMine(@Req() req: any) {
    return this.tripsService.findAllByUser(req.userId);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Headers('accept-language') acceptLang?: string,
  ) {
    const lang = I18nService.parseLang(acceptLang);
    return this.tripsService.findById(id, lang);
  }
}
