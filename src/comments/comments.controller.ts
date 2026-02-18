import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('trips/:tripId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async findByTrip(@Param('tripId') tripId: string) {
    return this.commentsService.findByTrip(tripId);
  }

  @Get('count')
  async getCount(@Param('tripId') tripId: string) {
    return this.commentsService.getCount(tripId);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Body('content') content: string,
  ) {
    return this.commentsService.create(req.userId, tripId, content);
  }
}
