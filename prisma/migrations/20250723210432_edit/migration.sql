/*
  Warnings:

  - You are about to drop the column `unit_id` on the `Property` table. All the data in the column will be lost.
  - Added the required column `property_id` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Ad" DROP CONSTRAINT "Ad_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_unit_id_fkey";

-- DropIndex
DROP INDEX "Property_unit_id_key";

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "unit_id";

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "property_id" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
