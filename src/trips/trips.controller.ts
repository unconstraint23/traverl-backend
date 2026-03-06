import { Controller, Get, Post, Body, Param, Req, UseGuards, Headers, Logger, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { I18nService } from '../i18n';

@Controller('trips')
export class TripsController {
  private readonly logger = new Logger(TripsController.name);

  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async create(
    @Req() req: any,
    @Body() dto: CreateTripDto,
    @Headers('accept-language') acceptLang?: string,
  ) {
    this.logger.log(`POST /trips - userId: ${req.userId}, destination: ${dto.destination}, duration: ${dto.duration}`);
    const lang = I18nService.parseLang(acceptLang);
    const result = await this.tripsService.create(req.userId, dto, lang);
    this.logger.log(`POST /trips - success, tripId: ${result.id}`);
    return result;
  }

  @Get()
  async findAll() {
    this.logger.log('GET /trips - fetching all trips');
    const result = await this.tripsService.findAll();
    this.logger.log(`GET /trips - success, count: ${result?.length || 0}`);
    return result;
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  async findMine(@Req() req: any) {
    this.logger.log(`GET /trips/mine - userId: ${req.userId}`);
    const result = await this.tripsService.findAllByUser(req.userId);
    this.logger.log(`GET /trips/mine - success, count: ${result?.length || 0}`);
    return result;
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Headers('accept-language') acceptLang?: string,
  ) {
    this.logger.log(`GET /trips/${id} - fetching trip details`);
    
    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      this.logger.warn(`GET /trips/${id} - invalid UUID format`);
      const lang = I18nService.parseLang(acceptLang);
      throw new NotFoundException(this.tripsService['i18n'].t('trips.not_found', lang));
    }
    
    const lang = I18nService.parseLang(acceptLang);
    const result = await this.tripsService.findById(id, lang);
    this.logger.log(`GET /trips/${id} - success, destination: ${result?.destination}`);
    return result;
  }
}
