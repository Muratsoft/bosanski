-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "ClassGroupMember" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "dueAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "fileUrl" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfTestResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'A1',
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "detailJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Homework_groupId_idx" ON "Homework"("groupId");

-- CreateIndex
CREATE INDEX "Homework_dueAt_idx" ON "Homework"("dueAt");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_userId_idx" ON "HomeworkSubmission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_homeworkId_userId_key" ON "HomeworkSubmission"("homeworkId", "userId");

-- CreateIndex
CREATE INDEX "SelfTestResult_studentId_idx" ON "SelfTestResult"("studentId");

-- CreateIndex
CREATE INDEX "SelfTestResult_teacherId_idx" ON "SelfTestResult"("teacherId");

-- CreateIndex
CREATE INDEX "SelfTestResult_createdAt_idx" ON "SelfTestResult"("createdAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_groupId_idx" ON "CalendarEvent"("groupId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfTestResult" ADD CONSTRAINT "SelfTestResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfTestResult" ADD CONSTRAINT "SelfTestResult_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

