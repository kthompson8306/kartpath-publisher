CREATE TABLE "newsletter_subscribers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "publication_id" uuid NOT NULL REFERENCES "publications"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "subscribed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "newsletter_subscribers_pub_email_idx" ON "newsletter_subscribers" ("publication_id", "email");

CREATE TABLE "nominations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "publication_id" uuid NOT NULL REFERENCES "publications"("id") ON DELETE CASCADE,
  "nominator_name" text NOT NULL,
  "nominator_email" text NOT NULL,
  "category" text NOT NULL,
  "story" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
