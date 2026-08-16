-- AlterTable
ALTER TABLE "ExamSubject" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Examination" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Mark" ADD COLUMN "deletedAt" DATETIME;
