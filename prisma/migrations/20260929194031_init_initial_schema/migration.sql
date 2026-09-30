-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'RETAILER', 'ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "RetailerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "EnquiryType" AS ENUM ('PRODUCT', 'GENERAL', 'BULK', 'RETAILER', 'CONTACT', 'WHOLESALE', 'WISHLIST');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "ContactSubject" AS ENUM ('GENERAL', 'PRODUCT_ENQUIRY', 'WHOLESALE', 'RETAILER_ONBOARDING', 'ORDER_STATUS', 'COMPLAINT', 'OTHER');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('CUSTOMER', 'RETAILER', 'ADMIN', 'GUEST');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'ICON', 'LOGO');

-- CreateEnum
CREATE TYPE "MediaUsage" AS ENUM ('PRODUCT_MAIN', 'PRODUCT_GALLERY', 'PRODUCT_PACKAGING', 'PRODUCT_SPEC', 'PROMOTIONAL', 'CATEGORY', 'BANNER', 'BRAND', 'BRAND_LOGO', 'AVATAR', 'GENERAL', 'OG');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_ENQUIRY', 'NEW_RETAILER', 'RETAILER_APPROVED', 'RETAILER_REJECTED', 'LOW_STOCK', 'NEW_REVIEW', 'CONTACT_FORM', 'BULK_ENQUIRY', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'SYSTEM', 'SECURITY');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'PUBLISH', 'UNPUBLISH', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'LOGOUT_ALL', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET', 'APPROVE', 'REJECT', 'SUSPEND', 'IMPORT', 'EXPORT', 'BACKUP', 'RESTORE', 'SETTINGS_UPDATE', 'MEDIA_UPLOAD', 'MEDIA_DELETE', 'TWOFA');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "PriceVisibility" AS ENUM ('HIDDEN', 'PUBLIC', 'RETAILER_ONLY');

-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('FULL', 'CONTAINER', 'HALF', 'SIDEBAR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "RetailerStatus" NOT NULL DEFAULT 'APPROVED',
    "avatarUrl" TEXT,
    "emailVerified" TIMESTAMP(3),
    "phoneVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recoveryCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "businessType" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "shopAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "gstin" TEXT,
    "categoriesInterested" TEXT[],
    "monthlyVolume" TEXT,
    "status" "RetailerStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "documentUrl" TEXT,
    "lastEnquiryAt" TIMESTAMP(3),
    "totalEnquiries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "icon" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "showInFooter" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "ogImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "country" TEXT,
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "mrp" DECIMAL(12,2),
    "costPrice" DECIMAL(12,2),
    "customerPrice" DECIMAL(12,2),
    "retailerPrice" DECIMAL(12,2),
    "showMrp" BOOLEAN NOT NULL DEFAULT true,
    "showCustomerPrice" BOOLEAN NOT NULL DEFAULT true,
    "showRetailerPrice" BOOLEAN NOT NULL DEFAULT true,
    "showDiscount" BOOLEAN NOT NULL DEFAULT true,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(6,2),
    "brandId" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "supportedModels" TEXT[],
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "minimumOrderQty" INTEGER NOT NULL DEFAULT 1,
    "minimumWholesaleQty" INTEGER NOT NULL DEFAULT 1,
    "wholesaleOnly" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT true,
    "isWholesaleDeal" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "ogImageUrl" TEXT,
    "canonicalUrl" TEXT,
    "searchKeywords" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "enquiryCount" INTEGER NOT NULL DEFAULT 0,
    "whatsappClickCount" INTEGER NOT NULL DEFAULT 0,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "blurDataUrl" TEXT,
    "alt" TEXT,
    "usage" "MediaUsage" NOT NULL DEFAULT 'PRODUCT_GALLERY',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "optionKey" TEXT,
    "optionValue" TEXT,
    "mrp" DECIMAL(12,2),
    "customerPrice" DECIMAL(12,2),
    "retailerPrice" DECIMAL(12,2),
    "costPrice" DECIMAL(12,2),
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "userType" "UserType" NOT NULL DEFAULT 'GUEST',
    "userId" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "sku" TEXT,
    "type" "EnquiryType" NOT NULL DEFAULT 'PRODUCT',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "priceShown" DECIMAL(12,2),
    "priceTier" TEXT,
    "quantity" INTEGER,
    "pageUrl" TEXT,
    "source" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assignedToId" TEXT,
    "contactedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_enquiries" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "userType" "UserType" NOT NULL DEFAULT 'GUEST',
    "message" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_enquiry_items" (
    "id" TEXT NOT NULL,
    "bulkEnquiryId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceShown" DECIMAL(12,2),
    "priceTier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_enquiry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "customerType" "UserType" NOT NULL DEFAULT 'CUSTOMER',
    "subject" "ContactSubject" NOT NULL DEFAULT 'GENERAL',
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "adminReply" TEXT,
    "ipHash" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "businessName" TEXT,
    "city" TEXT,
    "avatarUrl" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_session_items" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_session_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recently_viewed" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recently_viewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "eyebrow" TEXT,
    "imageUrl" TEXT,
    "mobileImageUrl" TEXT,
    "videoUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "secondaryCtaLabel" TEXT,
    "secondaryCtaUrl" TEXT,
    "position" TEXT NOT NULL DEFAULT 'HOME_HERO',
    "placement" "BannerPlacement" NOT NULL DEFAULT 'FULL',
    "textAlign" TEXT NOT NULL DEFAULT 'left',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "CouponType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,2) NOT NULL,
    "minOrderValue" DECIMAL(12,2),
    "minQuantity" INTEGER,
    "maxDiscount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableTo" TEXT NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "showInSchema" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "template" TEXT NOT NULL DEFAULT 'RICH_TEXT',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "showInFooter" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "ogImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "blurDataUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "usage" "MediaUsage" NOT NULL DEFAULT 'GENERAL',
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER NOT NULL,
    "alt" TEXT,
    "title" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'general',
    "provider" TEXT NOT NULL DEFAULT 'local',
    "publicId" TEXT,
    "tags" TEXT[],
    "productId" TEXT,
    "uploadedById" TEXT,
    "isOptimized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT 'S.E.S Mobile World',
    "tagline" TEXT NOT NULL DEFAULT 'Wholesale Mobile Spare Parts, Accessories & Electronics',
    "ownerName" TEXT NOT NULL DEFAULT 'Md. Saif',
    "logoUrl" TEXT,
    "logoAltText" TEXT,
    "faviconUrl" TEXT,
    "ogImageUrl" TEXT,
    "phone" TEXT NOT NULL DEFAULT '+918892399728',
    "whatsappNumber" TEXT NOT NULL DEFAULT '918892399728',
    "email" TEXT,
    "alternatePhone" TEXT,
    "addressLine1" TEXT NOT NULL DEFAULT 'Behind Police Station, Bur Road',
    "addressLine2" TEXT NOT NULL DEFAULT 'Opp. Aishwarya Medical',
    "city" TEXT NOT NULL DEFAULT 'Bangarpet',
    "state" TEXT NOT NULL DEFAULT 'Karnataka',
    "pincode" TEXT NOT NULL DEFAULT '563114',
    "country" TEXT NOT NULL DEFAULT 'India',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapsUrl" TEXT,
    "googleMapsEmbedUrl" TEXT,
    "gstin" TEXT NOT NULL DEFAULT '29HYBR57857HI2J',
    "businessHours" JSONB,
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "retailerPricingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wholesaleLandingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "showCostPriceToAdminOnly" BOOLEAN NOT NULL DEFAULT true,
    "allowGuestWishlist" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalForRetailer" BOOLEAN NOT NULL DEFAULT true,
    "enableReviews" BOOLEAN NOT NULL DEFAULT true,
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "enablePwa" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "twitterHandle" TEXT,
    "footerAbout" TEXT,
    "footerCopyright" TEXT,
    "analyticsSnippet" TEXT,
    "customHead" TEXT,
    "customBodyEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "entityId" TEXT,
    "entityType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_reads" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" "Role",
    "action" "ActivityAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityName" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "path" TEXT,
    "query" TEXT,
    "userType" "UserType",
    "sessionId" TEXT,
    "referrer" TEXT,
    "device" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analytics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "whatsappClicks" INTEGER NOT NULL DEFAULT 0,
    "enquiries" INTEGER NOT NULL DEFAULT 0,
    "wishlists" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "productViews" INTEGER NOT NULL DEFAULT 0,
    "categoryViews" INTEGER NOT NULL DEFAULT 0,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "whatsappClicks" INTEGER NOT NULL DEFAULT 0,
    "callClicks" INTEGER NOT NULL DEFAULT 0,
    "enquiries" INTEGER NOT NULL DEFAULT 0,
    "retailerRegistrations" INTEGER NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "normalised" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "clickedProductId" TEXT,
    "userType" "UserType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_records" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'AUTO',
    "storagePath" TEXT,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" TEXT NOT NULL,
    "importLogId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "errors" JSONB,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "login_attempts_identifier_createdAt_idx" ON "login_attempts"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_ipAddress_createdAt_idx" ON "login_attempts"("ipAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_profiles_userId_key" ON "retailer_profiles"("userId");

-- CreateIndex
CREATE INDEX "retailer_profiles_status_createdAt_idx" ON "retailer_profiles"("status", "createdAt");

-- CreateIndex
CREATE INDEX "retailer_profiles_gstin_idx" ON "retailer_profiles"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_position_idx" ON "categories"("parentId", "position");

-- CreateIndex
CREATE INDEX "categories_isActive_position_idx" ON "categories"("isActive", "position");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_isActive_name_idx" ON "brands"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_status_isFeatured_idx" ON "products"("status", "isFeatured");

-- CreateIndex
CREATE INDEX "products_status_isNewArrival_idx" ON "products"("status", "isNewArrival");

-- CreateIndex
CREATE INDEX "products_status_isBestSeller_idx" ON "products"("status", "isBestSeller");

-- CreateIndex
CREATE INDEX "products_categoryId_status_idx" ON "products"("categoryId", "status");

-- CreateIndex
CREATE INDEX "products_subcategoryId_status_idx" ON "products"("subcategoryId", "status");

-- CreateIndex
CREATE INDEX "products_brandId_status_idx" ON "products"("brandId", "status");

-- CreateIndex
CREATE INDEX "products_stockStatus_idx" ON "products"("stockStatus");

-- CreateIndex
CREATE INDEX "products_position_idx" ON "products"("position");

-- CreateIndex
CREATE INDEX "products_publishedAt_idx" ON "products"("publishedAt");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE INDEX "products_isDemo_idx" ON "products"("isDemo");

-- CreateIndex
CREATE INDEX "product_images_productId_position_idx" ON "product_images"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_isActive_idx" ON "product_variants"("productId", "isActive");

-- CreateIndex
CREATE INDEX "inventory_logs_productId_createdAt_idx" ON "inventory_logs"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "enquiries_reference_key" ON "enquiries"("reference");

-- CreateIndex
CREATE INDEX "enquiries_status_createdAt_idx" ON "enquiries"("status", "createdAt");

-- CreateIndex
CREATE INDEX "enquiries_type_createdAt_idx" ON "enquiries"("type", "createdAt");

-- CreateIndex
CREATE INDEX "enquiries_userType_createdAt_idx" ON "enquiries"("userType", "createdAt");

-- CreateIndex
CREATE INDEX "enquiries_phone_idx" ON "enquiries"("phone");

-- CreateIndex
CREATE INDEX "enquiries_email_idx" ON "enquiries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_enquiries_reference_key" ON "bulk_enquiries"("reference");

-- CreateIndex
CREATE INDEX "bulk_enquiries_status_createdAt_idx" ON "bulk_enquiries"("status", "createdAt");

-- CreateIndex
CREATE INDEX "bulk_enquiry_items_bulkEnquiryId_idx" ON "bulk_enquiry_items"("bulkEnquiryId");

-- CreateIndex
CREATE INDEX "contact_submissions_status_createdAt_idx" ON "contact_submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "contact_submissions_subject_idx" ON "contact_submissions"("subject");

-- CreateIndex
CREATE INDEX "reviews_productId_status_idx" ON "reviews"("productId", "status");

-- CreateIndex
CREATE INDEX "reviews_status_createdAt_idx" ON "reviews"("status", "createdAt");

-- CreateIndex
CREATE INDEX "testimonials_isActive_position_idx" ON "testimonials"("isActive", "position");

-- CreateIndex
CREATE INDEX "wishlist_items_userId_createdAt_idx" ON "wishlist_items"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_productId_key" ON "wishlist_items"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_sessions_sessionId_key" ON "wishlist_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_session_items_sessionId_productId_key" ON "wishlist_session_items"("sessionId", "productId");

-- CreateIndex
CREATE INDEX "recently_viewed_userId_lastViewedAt_idx" ON "recently_viewed"("userId", "lastViewedAt");

-- CreateIndex
CREATE INDEX "recently_viewed_sessionId_lastViewedAt_idx" ON "recently_viewed"("sessionId", "lastViewedAt");

-- CreateIndex
CREATE INDEX "recently_viewed_productId_idx" ON "recently_viewed"("productId");

-- CreateIndex
CREATE INDEX "banners_isActive_position_sortOrder_idx" ON "banners"("isActive", "position", "sortOrder");

-- CreateIndex
CREATE INDEX "banners_startDate_endDate_idx" ON "banners"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "coupons_isActive_expiresAt_idx" ON "coupons"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "faqs_isActive_position_idx" ON "faqs"("isActive", "position");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_isPublished_idx" ON "pages"("isPublished");

-- CreateIndex
CREATE INDEX "media_assets_usage_createdAt_idx" ON "media_assets"("usage", "createdAt");

-- CreateIndex
CREATE INDEX "media_assets_folder_idx" ON "media_assets"("folder");

-- CreateIndex
CREATE INDEX "media_assets_productId_idx" ON "media_assets"("productId");

-- CreateIndex
CREATE INDEX "social_links_isActive_position_idx" ON "social_links"("isActive", "position");

-- CreateIndex
CREATE UNIQUE INDEX "social_links_settingsId_platform_key" ON "social_links"("settingsId", "platform");

-- CreateIndex
CREATE INDEX "notifications_isRead_createdAt_idx" ON "notifications"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_reads_notificationId_userId_key" ON "notification_reads"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_userId_createdAt_idx" ON "activity_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_idx" ON "activity_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "analytics_events_type_createdAt_idx" ON "analytics_events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_entityType_entityId_createdAt_idx" ON "analytics_events"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- CreateIndex
CREATE INDEX "product_analytics_date_idx" ON "product_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "product_analytics_productId_date_key" ON "product_analytics"("productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_date_key" ON "daily_metrics"("date");

-- CreateIndex
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics"("date");

-- CreateIndex
CREATE INDEX "search_queries_normalised_createdAt_idx" ON "search_queries"("normalised", "createdAt");

-- CreateIndex
CREATE INDEX "search_queries_createdAt_idx" ON "search_queries"("createdAt");

-- CreateIndex
CREATE INDEX "backup_records_createdAt_idx" ON "backup_records"("createdAt");

-- CreateIndex
CREATE INDEX "import_logs_createdAt_idx" ON "import_logs"("createdAt");

-- CreateIndex
CREATE INDEX "import_rows_importLogId_isValid_idx" ON "import_rows"("importLogId", "isValid");

-- CreateIndex
CREATE INDEX "saved_filters_userId_idx" ON "saved_filters"("userId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_profiles" ADD CONSTRAINT "retailer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_enquiries" ADD CONSTRAINT "bulk_enquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_enquiry_items" ADD CONSTRAINT "bulk_enquiry_items_bulkEnquiryId_fkey" FOREIGN KEY ("bulkEnquiryId") REFERENCES "bulk_enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_enquiry_items" ADD CONSTRAINT "bulk_enquiry_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_session_items" ADD CONSTRAINT "wishlist_session_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wishlist_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "site_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_importLogId_fkey" FOREIGN KEY ("importLogId") REFERENCES "import_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
