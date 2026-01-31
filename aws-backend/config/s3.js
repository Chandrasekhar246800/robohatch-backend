const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

/**
 * AWS S3 Client Configuration
 * For secure STL file uploads
 * 
 * Security:
 * - Credentials from environment variables (never hardcoded)
 * - Private bucket (no public access)
 * - IAM user with limited S3 permissions
 */

// Validate AWS environment variables
const validateAwsConfig = () => {
  const required = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing AWS configuration:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error('AWS S3 configuration incomplete');
  }
};

// Validate configuration
validateAwsConfig();

/**
 * S3 Client Instance
 * Configured with credentials from environment
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Upload file to S3
 * 
 * @param {Buffer} fileBuffer - File content
 * @param {string} key - S3 object key (file path)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} S3 file URL
 */
const uploadToS3 = async (fileBuffer, key, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Private file (not publicly accessible)
      ACL: 'private'
    });

    await s3Client.send(command);

    // Return S3 URL (private, requires signed URL for access)
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    console.log(`✅ File uploaded to S3: ${key}`);
    return fileUrl;

  } catch (error) {
    console.error('❌ S3 upload error:', error.message);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Delete file from S3
 * 
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });

    await s3Client.send(command);
    
    console.log(`✅ File deleted from S3: ${key}`);

  } catch (error) {
    console.error('❌ S3 delete error:', error.message);
    throw new Error('Failed to delete file from S3');
  }
};

/**
 * Extract S3 key from full URL
 * 
 * @param {string} fileUrl - Full S3 URL
 * @returns {string} S3 object key
 */
const extractS3Key = (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    // Remove leading slash
    return url.pathname.substring(1);
  } catch (error) {
    console.error('❌ Invalid S3 URL:', fileUrl);
    throw new Error('Invalid S3 file URL');
  }
};

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  extractS3Key
};
