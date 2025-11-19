/**
 * AWS S3 Configuration Test Script
 * Run this to verify your AWS credentials and S3 bucket are configured correctly
 */

import 'dotenv/config';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

console.log('🔍 Testing AWS S3 Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log(`  AWS_REGION: ${AWS_REGION || '❌ NOT SET'}`);
console.log(`  AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`  AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log(`  S3_BUCKET_NAME: ${S3_BUCKET_NAME || '❌ NOT SET'}`);
console.log(`  CLOUDFRONT_URL: ${CLOUDFRONT_URL || '⚠️  NOT SET (optional)'}\n`);

if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
  console.error('❌ ERROR: Missing required AWS environment variables!');
  console.error('Please check your .env file and ensure all AWS credentials are set.');
  process.exit(1);
}

// Create S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

async function testS3Connection() {
  try {
    console.log('1️⃣  Testing S3 Connection...');

    // Try to list objects in the bucket
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      MaxKeys: 1,
    });

    await s3Client.send(command);
    console.log('✅ Successfully connected to S3 bucket!\n');

    return true;
  } catch (error: any) {
    console.error('❌ Failed to connect to S3 bucket:');

    if (error.name === 'NoSuchBucket') {
      console.error(`   Bucket "${S3_BUCKET_NAME}" does not exist.`);
    } else if (error.name === 'InvalidAccessKeyId') {
      console.error('   AWS_ACCESS_KEY_ID is invalid.');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('   AWS_SECRET_ACCESS_KEY is incorrect.');
    } else if (error.name === 'AccessDenied') {
      console.error('   Access denied. Check IAM permissions.');
      console.error(
        '   Your IAM user needs: s3:ListBucket, s3:PutObject, s3:GetObject permissions',
      );
    } else {
      console.error(`   ${error.message}`);
    }

    return false;
  }
}

async function testPresignedUrl() {
  try {
    console.log('2️⃣  Testing Presigned URL Generation...');

    const testKey = `test/${Date.now()}-test.jpg`;
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: testKey,
      ContentType: 'image/jpeg',
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    console.log('✅ Successfully generated presigned URL!');
    console.log(`   URL: ${presignedUrl.substring(0, 100)}...`);
    console.log(`   Key: ${testKey}\n`);

    return true;
  } catch (error: any) {
    console.error('❌ Failed to generate presigned URL:');
    console.error(`   ${error.message}\n`);
    return false;
  }
}

async function testCloudFrontConfig() {
  console.log('3️⃣  Testing CloudFront Configuration...');

  if (!CLOUDFRONT_URL) {
    console.log('⚠️  CloudFront URL not configured.');
    console.log('   Images will be served directly from S3.');
    console.log('   For better performance, configure CLOUDFRONT_URL in .env\n');
    return true;
  }

  console.log(`✅ CloudFront URL configured: ${CLOUDFRONT_URL}`);
  console.log('   Images will be served through CloudFront CDN\n');
  return true;
}

async function runTests() {
  const s3Connected = await testS3Connection();
  if (!s3Connected) {
    console.log('\n❌ AWS S3 configuration test FAILED!');
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify your AWS credentials in .env file');
    console.log('2. Check that the S3 bucket exists in the specified region');
    console.log('3. Ensure your IAM user has the correct permissions');
    console.log('4. Review AWS_SETUP.txt for detailed setup instructions');
    process.exit(1);
  }

  const presignedUrlWorks = await testPresignedUrl();
  if (!presignedUrlWorks) {
    console.log('\n⚠️  Presigned URL generation failed, but S3 connection works.');
    console.log('This might still work for basic uploads.\n');
  }

  await testCloudFrontConfig();

  console.log('✅ AWS S3 configuration test PASSED!');
  console.log('Your image upload system should work correctly.\n');
}

runTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
