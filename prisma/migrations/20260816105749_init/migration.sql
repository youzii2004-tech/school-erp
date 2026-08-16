-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AcademicSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Class_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "admissionNumber" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "cnicOrBForm" TEXT,
    "bloodGroup" TEXT,
    "photoPath" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "previousSchool" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cnic" TEXT,
    "address" TEXT
);

-- CreateTable
CREATE TABLE "GuardianLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "GuardianLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GuardianLink_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GuardianLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromotionHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "fromClassName" TEXT NOT NULL,
    "toClassName" TEXT NOT NULL,
    "fromSessionName" TEXT NOT NULL,
    "toSessionName" TEXT NOT NULL,
    "promotedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromotionHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "otherSchool" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "markedById" TEXT NOT NULL,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeVoucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "breakdown" TEXT NOT NULL,
    "previousBalance" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "fine" REAL NOT NULL DEFAULT 0,
    "totalPayable" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "FeeVoucher_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeeVoucher_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "FeePayment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "FeeVoucher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Examination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Examination_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examinationId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "totalMarks" REAL NOT NULL,
    "passingMarks" REAL NOT NULL,
    "examDate" DATETIME NOT NULL,
    CONSTRAINT "ExamSubject_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "Examination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examinationId" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "obtainedMarks" REAL NOT NULL,
    "enteredById" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mark_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "Examination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mark_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cnic" TEXT,
    "qualification" TEXT,
    "joiningDate" DATETIME,
    "designation" TEXT,
    "phone" TEXT,
    "photoPath" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    CONSTRAINT "TimetableEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimetableEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicSession_name_key" ON "AcademicSession"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_sessionId_key" ON "Class"("name", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_name_classId_key" ON "Section"("name", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianLink_studentId_guardianId_key" ON "GuardianLink"("studentId", "guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_academicSessionId_key" ON "Enrollment"("studentId", "academicSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_sectionId_rollNumber_academicSessionId_key" ON "Enrollment"("sectionId", "rollNumber", "academicSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FeeVoucher_voucherNumber_key" ON "FeeVoucher"("voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubject_examinationId_subjectId_classId_key" ON "ExamSubject"("examinationId", "subjectId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_examSubjectId_studentId_key" ON "Mark"("examSubjectId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_teacherId_subjectId_classId_sectionId_key" ON "TeacherSubject"("teacherId", "subjectId", "classId", "sectionId");
