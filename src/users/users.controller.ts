import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.userId);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() body: { name?: string; avatar_url?: string; bio?: string }) {
    return this.usersService.updateProfile(req.userId, body);
  }

  @Get('me/stats')
  async getStats(@Req() req: any) {
    return this.usersService.getStats(req.userId);
  }
}
