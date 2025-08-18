import s3 from '../config/s3.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

// @desc    Upload both original and watermarked versions
// @param   {Object} file - Multer file object
// @return  {Promise<{originalUrl: string, watermarkedUrl: string}>} URLs of both versions
export const uploadImageWithWatermark = async (file) => {
  try {
    const timestamp = Date.now();
    const originalKey = `originals/${timestamp}-${file.originalname}`;
    const watermarkedKey = `watermarked/${timestamp}-${file.originalname}`;

    // Create watermark
    const watermarkSvg = Buffer.from(`
      <svg width="100%" height="100%">
        <style>
          .watermark {
            fill: rgba(255, 255, 255, 0.5);
            font-size: 48px;
            font-weight: bold;
            font-family: Arial;
          }
        </style>
        <text x="50%" y="50%" text-anchor="middle" class="watermark">PHOTOBUG</text>
      </svg>
    `);

    // Process watermark
    const watermarkedBuffer = await sharp(file.buffer)
      .composite([
        {
          input: watermarkSvg,
          tile: true,
          blend: 'over',
        },
      ])
      .toBuffer();

    const [originalUrl, watermarkedUrl] = await Promise.all([
      s3
        .send(
          new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: originalKey,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        )
        .then(
          () =>
            `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${originalKey}`
        ),
      s3
        .send(
          new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: watermarkedKey,
            Body: watermarkedBuffer,
            ContentType: file.mimetype,
          })
        )
        .then(
          () =>
            `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${watermarkedKey}`
        ),
    ]);

    return { originalUrl, watermarkedUrl };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to process image upload');
  }
};

export const deleteObjectsFromS3 = async (objectUrls) => {
  if (!objectUrls || objectUrls.length === 0) return;

  const deleteParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Delete: {
      Objects: objectUrls.map((url) => ({
        Key: url.split('.com/')[1],
      })),
    },
  };

  try {
    await s3.deleteObjects(deleteParams).promise();
    console.log('Objects deleted successfully');
  } catch (error) {
    console.error('Error deleting objects from S3:', error);
  }
};
