import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, BucketProps, EventType } from 'aws-cdk-lib/aws-s3';
import { PrivateBucket } from './PrivateBucket';
import { ZipFunction } from './ZipFunction';

/**
 * A Lambda function triggered by s3 bucket events.
 *
 * Defaults for the bucket are as per PrivateBucket:
 *  - encryption: BucketEncryption.S3_MANAGED
 *  = blockPublicAccess: BlockPublicAccess.BLOCK_ALL
 *  - removalPolicy: RemovalPolicy.DESTROY
 *
 * NB By default, Cloudformation will attempt to destroy the bucket when the stack is destroyed,
 * however we don't set auto-delete objects to true, so this will fail if the bucket is not empty,
 * which prevents losing content,
 *
 * The reason for this is that when experimenting with building stacks you can end up with a
 * bunch of orphaned resources. This setting effectively protects buckets that have content in them
 * But allows for deleting an empty bucket.
 *
 * If you want to delete the bucket and all contents, pass { autoDeleteObjects: true } in bucketProps.
 */
export class BucketLambda extends Construct {
  bucket: Bucket;

  lambda: Function;

  constructor(
    scope: Construct,
    id: string,
    environment?: { [key: string]: string; },
    lambdaProps?: Partial<FunctionProps>,
    bucketProps?: Partial<BucketProps>,
    events: EventType[] = [EventType.OBJECT_CREATED],
  ) {
    super(scope, `${id}BucketLambda`);
    // Triggering bucket
    this.bucket = new PrivateBucket(scope, `${id}Bucket`, bucketProps);

    this.lambda = new ZipFunction(scope, id, environment, { ...lambdaProps });
    this.lambda.addEventSource(new S3EventSource(this.bucket, { events }));
  }
}