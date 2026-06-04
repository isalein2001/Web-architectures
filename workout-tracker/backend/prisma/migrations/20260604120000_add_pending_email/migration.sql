-- AlterTable
ALTER TABLE "users" ADD COLUMN "pending_email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_pending_email_key" ON "users"("pending_email");
