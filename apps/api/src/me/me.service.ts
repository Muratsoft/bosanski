import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(userId: string) {
    const now = new Date();

    const [
      user,
      subscription,
      memberships,
      lessonCount,
      nextEvent,
      pendingHomeworks,
      upcomingPayment,
      completedCourses,
      recentSelfTests,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          avatarUrl: true,
          referralCode: true,
        },
      }),
      this.prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
      this.prisma.classGroupMember.findMany({
        where: { userId },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
              periodLabel: true,
              level: true,
            },
          },
        },
      }),
      this.prisma.calendarEnrollment.count({
        where: {
          userId,
          event: { endAt: { lt: now } },
        },
      }),
      this.prisma.calendarEvent.findFirst({
        where: {
          published: true,
          startAt: { gte: now },
          OR: [
            { enrollments: { some: { userId } } },
            {
              group: { members: { some: { userId } } },
            },
          ],
        },
        orderBy: { startAt: 'asc' },
        include: {
          group: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.homework.findMany({
        where: {
          published: true,
          group: { members: { some: { userId } } },
          submissions: { none: { userId, done: true } },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: 10,
        include: {
          group: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.payment.findFirst({
        where: {
          userId,
          status: { in: ['PENDING'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { include: { plan: true } },
        },
      }),
      this.prisma.classGroupMember.findMany({
        where: { userId, completedAt: { not: null } },
        include: {
          group: {
            select: { id: true, name: true, slug: true, periodLabel: true },
          },
        },
      }),
      this.prisma.selfTestResult.findMany({
        where: { studentId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      user,
      subscription,
      groups: memberships.map((m) => ({
        ...m.group,
        joinedAt: m.joinedAt,
        completedAt: m.completedAt,
      })),
      lessonsAttended: lessonCount,
      nextLesson: nextEvent,
      pendingHomeworks,
      upcomingPayment,
      completedCourses: completedCourses.map((c) => c.group),
      recentSelfTests,
      alerts: {
        nextLesson: nextEvent
          ? {
              title: nextEvent.title,
              startAt: nextEvent.startAt,
              meetUrl: nextEvent.meetUrl,
              groupName: nextEvent.group?.name,
            }
          : null,
        pendingHomeworkCount: pendingHomeworks.length,
        pendingHomeworks: pendingHomeworks.slice(0, 3).map((h) => ({
          id: h.id,
          title: h.title,
          dueAt: h.dueAt,
          groupName: h.group.name,
          groupSlug: h.group.slug,
        })),
      },
    };
  }
}
