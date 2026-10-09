import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  PaymentReminderKind,
  PaymentStatus,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { SubmitPaymentDto } from './dto/submit-payment.dto.js';
import { ReviewPaymentDto } from './dto/review-payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  listPlans() {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { priceTry: 'asc' }],
    });
  }

  async mySubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.PENDING_PAYMENT,
            SubscriptionStatus.ACTIVE,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    const plan = await this.prisma.plan.findFirst({
      where: { code: dto.planCode, active: true },
    });
    if (!plan) throw new NotFoundException('Paket bulunamadı');

    const existingActive = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.PENDING_PAYMENT,
            SubscriptionStatus.ACTIVE,
          ],
        },
      },
    });
    if (existingActive) {
      throw new ConflictException(
        'Zaten bekleyen veya aktif bir aboneliğiniz var',
      );
    }

    let referralCodeUsed: string | undefined;
    if (dto.referralCode?.trim()) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode.trim() },
      });
      if (!referrer || referrer.id === userId) {
        throw new BadRequestException('Geçersiz davet kodu');
      }
      referralCodeUsed = referrer.referralCode;
      await this.prisma.user.update({
        where: { id: userId },
        data: { referredById: referrer.id },
      });
    }

    const discounted = Math.round(
      plan.priceTry * (1 - plan.discountPercent / 100),
    );

    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.PENDING_PAYMENT,
          referralCodeUsed,
        },
        include: { plan: true },
      });

      const payment = await tx.payment.create({
        data: {
          subscriptionId: subscription.id,
          userId,
          amountTry: discounted,
          status: PaymentStatus.PENDING,
        },
      });

      return { subscription, payment };
    });
  }

  async submitPayment(
    userId: string,
    paymentId: string,
    dto: SubmitPaymentDto,
  ) {
    if (!dto.receiptUrl && !dto.note) {
      throw new BadRequestException('Dekont linki veya not gerekli');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Ödeme bulunamadı');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Bu ödeme güncellenemez');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptUrl: dto.receiptUrl?.trim(),
        note: dto.note?.trim(),
      },
      include: { subscription: { include: { plan: true } } },
    });
  }

  listPendingPayments() {
    return this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            referralCode: true,
          },
        },
        subscription: { include: { plan: true } },
      },
    });
  }

  async reviewPayment(
    paymentId: string,
    reviewerId: string,
    dto: ReviewPaymentDto,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: { include: { plan: true } },
        user: true,
      },
    });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Ödeme zaten incelendi');
    }

    if (dto.decision === 'REJECTED') {
      const updated = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REJECTED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          rejectReason: dto.rejectReason?.trim(),
        },
      });
      await this.prisma.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'PAYMENT_REJECTED',
          entityType: 'Payment',
          entityId: paymentId,
          meta: JSON.stringify({ reason: dto.rejectReason }),
        },
      });
      return updated;
    }

    const plan = payment.subscription.plan;
    const now = new Date();
    let bonusDays = 0;
    if (payment.subscription.referralCodeUsed && plan.referralBonusDays > 0) {
      bonusDays = plan.referralBonusDays;
    }
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + plan.durationMonths);
    if (bonusDays > 0) {
      endsAt.setDate(endsAt.getDate() + bonusDays);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const approved = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: now,
        },
      });

      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startsAt: now,
          endsAt,
          bonusDaysApplied: bonusDays,
        },
      });

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          status: AccountStatus.ACTIVE,
          role:
            payment.user.role === Role.MEMBER
              ? Role.STUDENT
              : payment.user.role,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'PAYMENT_APPROVED',
          entityType: 'Payment',
          entityId: paymentId,
          meta: JSON.stringify({
            endsAt: endsAt.toISOString(),
            bonusDays,
          }),
        },
      });

      return approved;
    });

    await this.mail.sendPaymentApproved({
      email: payment.user.email,
      displayName: payment.user.displayName,
      planName: plan.name,
      endsAt,
      bonusDays,
    });

    return result;
  }

  async processPaymentReminders() {
    const now = Date.now();
    const windows: {
      kind: PaymentReminderKind;
      minMs: number;
      maxMs: number;
    }[] = [
      {
        kind: PaymentReminderKind.PAYMENT_7D,
        minMs: 6.5 * 24 * 60 * 60 * 1000,
        maxMs: 7.5 * 24 * 60 * 60 * 1000,
      },
      {
        kind: PaymentReminderKind.PAYMENT_3D,
        minMs: 2.5 * 24 * 60 * 60 * 1000,
        maxMs: 3.5 * 24 * 60 * 60 * 1000,
      },
      {
        kind: PaymentReminderKind.PAYMENT_1D,
        minMs: 20 * 60 * 60 * 1000,
        maxMs: 28 * 60 * 60 * 1000,
      },
    ];

    let sent = 0;

    for (const window of windows) {
      const from = new Date(now + window.minMs);
      const to = new Date(now + window.maxMs);

      const subs = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endsAt: { gte: from, lte: to },
        },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          plan: true,
        },
      });

      for (const sub of subs) {
        if (!sub.endsAt) continue;
        const exists = await this.prisma.paymentReminderLog.findUnique({
          where: {
            subscriptionId_userId_kind: {
              subscriptionId: sub.id,
              userId: sub.userId,
              kind: window.kind,
            },
          },
        });
        if (exists) continue;

        const days =
          window.kind === PaymentReminderKind.PAYMENT_7D
            ? 7
            : window.kind === PaymentReminderKind.PAYMENT_3D
              ? 3
              : 1;

        await this.mail.sendPaymentDueReminder({
          email: sub.user.email,
          displayName: sub.user.displayName,
          planName: sub.plan.name,
          endsAt: sub.endsAt,
          daysLeft: days,
        });

        await this.prisma.paymentReminderLog.create({
          data: {
            subscriptionId: sub.id,
            userId: sub.userId,
            kind: window.kind,
          },
        });
        sent += 1;
      }
    }

    // Süresi dolanları EXPIRED yap
    await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endsAt: { lt: new Date() },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    return { sent };
  }
}
