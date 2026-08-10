CREATE TABLE IF NOT EXISTS "content_item_gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"sort_order" integer NOT NULL DEFAULT 0,
	"caption" text,
	"created_at" timestamptz NOT NULL DEFAULT NOW(),
	CONSTRAINT "content_item_gallery_content_item_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "content_item_gallery_media_asset_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_item_gallery_item_media_idx" ON "content_item_gallery" ("content_item_id","media_asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_item_gallery_item_order_idx" ON "content_item_gallery" ("content_item_id","sort_order");
