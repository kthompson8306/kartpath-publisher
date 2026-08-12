ALTER TABLE content_items ADD COLUMN IF NOT EXISTS listing_tier text NOT NULL DEFAULT 'standard';
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS business_description text;
