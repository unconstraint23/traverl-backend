import { Controller, Get, Post, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() dto: CreateTripDto) {
    return this.tripsService.create(req.userId, dto);
  }

  @Get()
  async findAll(@Query('user') userId?: string) {
    if (userId) {
      return this.tripsService.findAllByUser(userId);
    }
    return this.tripsService.findAll();
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  async findMine(@Req() req: any) {
    return this.tripsService.findAllByUser(req.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.tripsService.findById(id);
  }
}
