import { Controller, Get, Query } from '@nestjs/common';
import { DestinationsService } from './destinations.service';

@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Get()
  async findAll(@Query('category') category?: string) {
    return this.destinationsService.findAll(category);
  }

  @Get('trending')
  async getTrending() {
    return this.destinationsService.getTrending();
  }

  @Get('categories')
  async getCategories() {
    return this.destinationsService.getCategories();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.destinationsService.search(query);
  }
}
