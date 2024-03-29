# CDK Patterns

Provides a set of functions that can be called to build common serverless CDK patterns.

This is intended to provide you with the patterns you'll mostly need most of the time and, if you have an edge-case, example code you can reuse that helps you get what you need done more easily.

## Overview

I'm publishing this to help others because I've been using it for a couple of years now and it's been a real help for projects I've worked on (personal and professional). It's grown organically, accumulating patterns I've reached for repeatedly, so there's no comprehensive documentation at his stage! Please be kind.

A couple of highlights:

 * `queueLambda()` - creates a Lambda function fed by an SQS queue
 * `webAppRoutes` - creates a Cloudfront distribution with a bucket for hosting static content (e.g. a React app) and Lambda functions to handle requests made to specific path prefixes
 * `cognitoPool` - creates a Cognito user pool and optionally configures Google, Facebook and SAML (sso) login
 * `ghaUser` - if you use Github Actions, this generates an IAM user access key with permission to deploy to resources defined in your stack (see also `addGha*` functions such as `addGhaSecret`, `addGhaVariable`, `addGhaLambda` etc.)

## Philosophy and contribution

I've refined these patterns since 2020 to keep them as clean, simple and useful as possible. My main aim is to build a library that gives you what you usually need, most of the time. That means it makes assumptions and has some opinions.

Most of the work has focused on Lambdas packaged as zip files. Some of the container code hasn't been touched in a while so this may be less up to date.

If you need something that's more specific / more configurable and isn't catered for you can:

  * Use the source code of existing functions as a starting point to develop CDK code that meets your use-case
  * Open an issue or send me a pull request if you see an opportunity for improvement

