import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function createTables() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    return;
  }

  try {
    console.log('Creating listings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listings (
        id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        ownerId int NOT NULL,
        agentId int,
        agencyId int,
        action enum('sell', 'rent', 'auction') NOT NULL,
        propertyType enum('apartment', 'house', 'farm', 'land', 'commercial', 'shared_living') NOT NULL,
        title varchar(255) NOT NULL,
        description text NOT NULL,
        askingPrice decimal(12, 2),
        negotiable int DEFAULT 0,
        transferCostEstimate decimal(12, 2),
        monthlyRent decimal(12, 2),
        deposit decimal(12, 2),
        leaseTerms varchar(100),
        availableFrom timestamp NULL,
        utilitiesIncluded int DEFAULT 0,
        startingBid decimal(12, 2),
        reservePrice decimal(12, 2),
        auctionDateTime timestamp NULL,
        auctionTermsDocumentUrl text,
        propertyDetails json,
        address text NOT NULL,
        latitude decimal(10, 7) NOT NULL,
        longitude decimal(10, 7) NOT NULL,
        city varchar(100) NOT NULL,
        suburb varchar(100),
        province varchar(100) NOT NULL,
        postalCode varchar(20),
        placeId varchar(255),
        mainMediaId int,
        mainMediaType enum('image', 'video'),
        status enum('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived', 'sold', 'rented') DEFAULT 'draft' NOT NULL,
        approvalStatus enum('pending', 'approved', 'rejected') DEFAULT 'pending',
        reviewedBy int,
        reviewedAt timestamp NULL,
        rejectionReason text,
        autoPublished int DEFAULT 0,
        slug varchar(255) NOT NULL,
        metaTitle varchar(255),
        metaDescription text,
        canonicalUrl text,
        searchTags text,
        featured int DEFAULT 0 NOT NULL,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        publishedAt timestamp NULL,
        archivedAt timestamp NULL
      );
    `);

    console.log('Creating listing_media table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listing_media (
        id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        listingId int NOT NULL,
        mediaType enum('image', 'video', 'floorplan', 'pdf') NOT NULL,
        originalUrl text NOT NULL,
        originalFileName varchar(255),
        originalFileSize int,
        processedUrl text,
        thumbnailUrl text,
        previewUrl text,
        width int,
        height int,
        duration int,
        mimeType varchar(100),
        orientation enum('vertical', 'horizontal', 'square'),
        isVertical int DEFAULT 0,
        displayOrder int DEFAULT 0 NOT NULL,
        isPrimary int DEFAULT 0 NOT NULL,
        processingStatus enum('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        processingError text,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        uploadedAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        processedAt timestamp NULL,
        FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE
      );
    `);

    console.log('Creating listing_analytics table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listing_analytics (
        id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        listingId int NOT NULL,
        totalViews int DEFAULT 0 NOT NULL,
        uniqueVisitors int DEFAULT 0 NOT NULL,
        viewsByDay json,
        totalLeads int DEFAULT 0 NOT NULL,
        contactFormLeads int DEFAULT 0 NOT NULL,
        whatsappClicks int DEFAULT 0 NOT NULL,
        phoneReveals int DEFAULT 0 NOT NULL,
        bookingViewingRequests int DEFAULT 0 NOT NULL,
        totalFavorites int DEFAULT 0 NOT NULL,
        totalShares int DEFAULT 0 NOT NULL,
        averageTimeOnPage int,
        trafficSources json,
        conversionRate decimal(5, 2),
        leadConversionRate decimal(5, 2),
        lastUpdated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE
      );
    `);

    console.log('Creating listing_leads table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listing_leads (
        id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        listingId int NOT NULL,
        name varchar(200) NOT NULL,
        email varchar(320),
        phone varchar(50),
        message text,
        leadType enum('contact_form', 'whatsapp_click', 'phone_reveal', 'book_viewing', 'make_offer', 'request_info') NOT NULL,
        source varchar(100),
        referrer text,
        utmSource varchar(100),
        utmMedium varchar(100),
        utmCampaign varchar(100),
        assignedTo int,
        assignedAt timestamp NULL,
        status enum('new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_made', 'converted', 'lost') DEFAULT 'new' NOT NULL,
        crmSynced int DEFAULT 0,
        crmSyncedAt timestamp NULL,
        crmId varchar(255),
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE
      );
    `);

    console.log('Creating listing_viewings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listing_viewings (
        id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        listingId int NOT NULL,
        leadId int,
        scheduledDate timestamp NOT NULL,
        duration int DEFAULT 30,
        visitorName varchar(200) NOT NULL,
        visitorEmail varchar(320),
        visitorPhone varchar(50),
        status enum('requested', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'requested' NOT NULL,
        agentId int,
        agentNotes text,
        visitorFeedback text,
        visitorRating int,
        reminderSent int DEFAULT 0,
        confirmationSent int DEFAULT 0,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE
      );
    `);

    console.log('Creating listing_approval_queue table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listing_approval_queue (
        id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        listingId int NOT NULL,
        submittedBy int NOT NULL,
        submittedAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status enum('pending', 'reviewing', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
        priority enum('low', 'normal', 'high', 'urgent') DEFAULT 'normal' NOT NULL,
        reviewedBy int,
        reviewedAt timestamp NULL,
        reviewNotes text,
        rejectionReason text,
        complianceChecks json,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE
      );
    `);

    console.log('Creating listing_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listing_settings (
        id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        autoPublishForVerifiedAccounts int DEFAULT 0 NOT NULL,
        maxImagesPerListing int DEFAULT 30 NOT NULL,
        maxVideosPerListing int DEFAULT 5 NOT NULL,
        maxFloorplansPerListing int DEFAULT 5 NOT NULL,
        maxPdfsPerListing int DEFAULT 3 NOT NULL,
        maxImageSizeMB int DEFAULT 5 NOT NULL,
        maxVideoSizeMB int DEFAULT 50 NOT NULL,
        maxVideoDurationSeconds int DEFAULT 180 NOT NULL,
        videoCompressionEnabled int DEFAULT 1 NOT NULL,
        videoThumbnailEnabled int DEFAULT 1 NOT NULL,
        videoPreviewClipSeconds int DEFAULT 3 NOT NULL,
        crmWebhookUrl text,
        crmEnabled int DEFAULT 0 NOT NULL,
        newListingNotificationsEnabled int DEFAULT 1 NOT NULL,
        leadNotificationsEnabled int DEFAULT 1 NOT NULL,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        updatedBy int
      );
    `);

    console.log('Tables created successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
  process.exit(0);
}

createTables();
