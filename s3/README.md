# s3 CRUD utility functions

A collection of wrapper functions for the AWS SDKv3 that provide simplified CRUD and list operations.

This is intended to provide you with the operations you'll mostly need most of the time and, if you have an edge-case, example code you can reuse that helps you get what you need done more easily.

## Functions

This package allows you to work with binary and JSON objects.

### Binary objects

 * `putObject(bucket, key, object)`: puts content to s3
 * `getObject(bucket, key)`: gets content from s3

### JSON objests

 * `putJson(bucket, key, object)`: stringifies the object and puts it to s3
 * `getJson(bucket, key)`: gets content from s3 and parses it as JSON

### List and delete

 * `deleteObject(bucket, key)`: deletes an object from s3
 * `listObjects(bucket, prefix)`: lists matching keys from the bucket
 * `objectExists(bucket, key)`: determines whether a single matching key exists in the bucket
