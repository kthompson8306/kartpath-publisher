ALTER TABLE "content_items" ADD COLUMN "cover_focal_x" double precision NOT NULL DEFAULT 0.5;
ALTER TABLE "content_items" ADD COLUMN "cover_focal_y" double precision NOT NULL DEFAULT 0.5;
ALTER TABLE "media_assets" DROP COLUMN IF EXISTS "cover_position";