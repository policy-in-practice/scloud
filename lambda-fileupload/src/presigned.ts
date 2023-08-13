import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client();

/**
 * Ensures no leading or training slashes
 */
export function tidy(path: string): string {
  return path.split('/').filter((segment) => segment).join('/');
}

/**
 * Generates a pre-signed url for a GET request to the specified bucket and key. This is useful for downloading a file from S3 programmatically.
 * This allows you to download files via API Gateway & Lambda where there's a request payload size limit of 10MB & 6MB.
 * This is particularly useful for, say, a mobile app, as it allows the app to download a file without needing to hold AWS credentials locally on the device.
 * @param expires (optional) The number of seconds until the presigned url expires, defaults to 600 (1 minute) to allow for clock drift.
 * @returns The signed url as a string
 */
export async function getUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: tidy(key) });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generates a pre-signed url for a PUT request to the specified bucket and key. This is useful for uploading a file to S3 programmatically.
 * This allows you to upload files via API Gateway & Lambda where there's a request payload size limit of 10MB & 6MB.
 * This is particularly useful for, say, a mobile app, as it allows the app to upload a file without needing to hold AWS credentials locally on the device.
 * @param expires (optional) The number of seconds until the presigned url expires, defaults to 600 (1 minute) to allow for clock drift.
 * @returns The signed url as a string
 */
export async function putUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucket, Key: tidy(key) });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generates pre-signed POST details suitable for use e.g. on a form on a web page to upload a file to S3.
 * See: https://www.npmjs.com/package/@aws-sdk/s3-presigned-post
 * @param bucket The bucket to upload to
 * @param key The key to upload to
 * @param expires (optional) The number of seconds until the presigned post expires, defaults to 3600 (1 hour) to give a user time to submit the form
 * @param maxSize (optional) The maximum size of the file to allow for upload, defaults to 100M
 * @returns A form action url and (hidden) field values for the upload form. For documentation see: https://www.npmjs.com/package/@aws-sdk/s3-presigned-post#user-content-post-file-using-html-form
 */
export async function postUrl(bucket: string, key: string, expires: number = 3600, maxSize: number = 1024 * 1024 * 100):
  Promise<{ url: string, fields: Record<string, any>; }> {
  const { url, fields } = await createPresignedPost(client, {
    Bucket: bucket,
    Key: tidy(key),
    Expires: expires,
    Conditions: [
      ['content-length-range', 0, maxSize], // 100M - should be plenty of headroom
    ],
  });

  return {
    url,
    fields,
  };
}
