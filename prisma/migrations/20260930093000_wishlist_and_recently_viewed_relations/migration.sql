-- AlterTable: link guest wishlist rows to their product so the wishlist API can
-- serialise them through the standard product select.
ALTER TABLE "wishlist_session_items"
    ADD CONSTRAINT "wishlist_session_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: de-duplicate recently viewed rows before adding the unique keys
-- used by the upsert paths. Postgres treats NULLs as distinct, so the (userId,
-- productId) and (sessionId, productId) pairs never conflict with each other.
DELETE FROM "recently_viewed" rv
WHERE rv."id" IN (
    SELECT "id"
    FROM (
        SELECT "id",
               ROW_NUMBER() OVER (
                   PARTITION BY "userId", "productId", "sessionId"
                   ORDER BY "lastViewedAt" DESC
               ) AS rn
        FROM "recently_viewed"
    ) ranked
    WHERE ranked.rn > 1
);

ALTER TABLE "recently_viewed"
    ADD CONSTRAINT "recently_viewed_userId_productId_key"
    UNIQUE ("userId", "productId");

ALTER TABLE "recently_viewed"
    ADD CONSTRAINT "recently_viewed_sessionId_productId_key"
    UNIQUE ("sessionId", "productId");

-- CreateIndex: supports the guest recently-viewed lookup
CREATE INDEX "wishlist_session_items_productId_idx" ON "wishlist_session_items"("productId");
