PRAGMA foreign_keys=OFF;

ALTER TABLE "Job" ADD COLUMN "cvStatus" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "Job" ADD COLUMN "cvError" TEXT;
ALTER TABLE "Job" ADD COLUMN "activeCvVersionId" TEXT;
ALTER TABLE "Job" ADD COLUMN "workMode" TEXT;
ALTER TABLE "Job" ADD COLUMN "brazilEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "isTech" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "classificationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Job" ADD COLUMN "classificationConfidence" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "classificationReason" TEXT;
ALTER TABLE "Job" ADD COLUMN "seniority" TEXT;
ALTER TABLE "Job" ADD COLUMN "technologies" TEXT;
ALTER TABLE "Job" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "Job" ADD COLUMN "canonicalUrl" TEXT;
UPDATE "Job" SET "status" = 'ready_to_apply' WHERE "status" = 'applying';

CREATE TABLE "CvVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jobId" TEXT NOT NULL,
  "originalText" TEXT NOT NULL,
  "optimizedText" TEXT NOT NULL,
  "pdfPath" TEXT NOT NULL,
  "atsReport" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL DEFAULT 'v1',
  "usedFallback" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CvVersion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ScrapeRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "sources" TEXT NOT NULL,
  "resultsCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" DATETIME,
  "finishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

PRAGMA foreign_keys=ON;
