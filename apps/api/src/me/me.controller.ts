import { Controller, Get } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { MeService } from './me.service.js';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.meService.dashboard(user.id);
  }
}
