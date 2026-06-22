CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "ingredients"
  ALTER COLUMN "embedding" TYPE vector(384)
  USING "embedding"::text::vector;