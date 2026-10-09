import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { SubmitPaymentDto } from './dto/submit-payment.dto.js';
import { ReviewPaymentDto } from './dto/review-payment.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('plans')
  listPlans() {
    return this.paymentsService.listPlans();
  }

  @Get('me')
  mySubscription(@CurrentUser() user: AuthUser) {
    return this.paymentsService.mySubscription(user.id);
  }

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: AuthUser) {
    return this.paymentsService.subscribe(user.id, dto);
  }

  @Patch('payments/:id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.submitPayment(user.id, id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('admin/pending')
  pending() {
    return this.paymentsService.listPendingPayments();
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('admin/payments/:id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.reviewPayment(id, user.id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('admin/reminders/run')
  runReminders() {
    return this.paymentsService.processPaymentReminders();
  }
}
