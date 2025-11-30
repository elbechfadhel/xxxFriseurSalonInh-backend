/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,date]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Reservation_employeeId_date_key" ON "Reservation"("employeeId", "date");
