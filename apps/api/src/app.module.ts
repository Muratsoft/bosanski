import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { MailModule } from './mail/mail.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AdminModule } from './admin/admin.module.js';
import { DictionaryModule } from './dictionary/dictionary.module.js';
import { LessonsModule } from './lessons/lessons.module.js';
import { SearchModule } from './search/search.module.js';
import { ForumModule } from './forum/forum.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { AiModule } from './ai/ai.module.js';
import { GamesModule } from './games/games.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller.js';
import { AppController } from './app.controller.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    AdminModule,
    DictionaryModule,
    LessonsModule,
    SearchModule,
    ForumModule,
    CalendarModule,
    PaymentsModule,
    AiModule,
    GamesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
