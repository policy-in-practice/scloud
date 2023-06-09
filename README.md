# scloud

_AWS CDK patterns for assembling serverless infrastructures_

If you're not massively interested in infrastructure, but want to do it well, without making it your mission in life then scloud could be what you need.

It's bunch of things done well that you can benefit from. I use it to store chunks of reference code I use each time I build a new service.

## NPM packages

This repo contains a bunch of useful example code. If you'd prefer to install some useful libraries to get going with creating serverless infrastructure and code, I've published a bunch of packages on NPM:

 * *@scloud/cdk-patterns* - patterns I use regularly to put together serverless architectures: https://www.npmjs.com/package/@scloud/cdk-patterns
 * *@scloud/cdk-github* - works with the CDK patterns to automate setting secrets and variables in Github Actions, based on the outputs of the `ghaUser` pattern: https://www.npmjs.com/package/@scloud/cdk-github
 * *@scloud/lambda-local* - enables you to run a Lambda habdler locally for development using an Express server to translate HTTP requests to Lambda events. Implemented for API Gateway and SQS: https://www.npmjs.com/package/@scloud/lambda-local
 * *@scloud/lambda-queue* - a helper function to take the boilerplate out of building Lambda functions that handle SQS mw
essages: https://www.npmjs.com/package/@scloud/lambda-queue

## Scloud structure and conventions

Scloud makes a few assumptions about what the repository structure looks like:

 * A folder `/infrastructure` containing CDK Cloudformation Stack code
 * A folder `/infrastructure/secrets` containing inputs for the stack, outputs from stack deployment and optionally Github credentials for automating setting variables and secrets on your repository
 * Folders at the top level (alongside `/infrastructure`) that represent deployable components (e.g. Lambda function code)
 * Actions workflows under `.github/workflows` named to match deployable components (e.g. a top-level folder `/component1` would have a matching workflow called `.github/workflows/component1.yml`)
 * By convention, each deployable component has a correspondingly-named function in the CDK code that builds the infrastructure for that component (e.g. `/component1` would relate to a function called `component1()` in `/infrastructure/lib/project-stack.ts`)

 The aim is to reduce cognitive load and build good expectations about the pieces that make up your system.

## Serverless CDK infrastructure

The folder you're likely looking for is: https://github.com/davidcarboni/scloud/tree/main/cdk-patterns/src

This repo contains a set of AWS CDK patterns packaged as functions so you can put serverless architectures together with a few function calls. The aim is to make it easy to put together typical infrastructure building blocks that can be reused (and/or tweaked) across projects.

The name 'scloud' means 'simple cloud', but could equally mean other things. These patterns are designed to be basic and not finely configurable, on the basis that keeping things standad, simple, even a bit stupid (you can decide for yourself what the S in Scloud stands for) is a good way to get things done and get on with life.

## Github secrets and variables

The other folder you'll want to look in is: https://github.com/davidcarboni/scloud/tree/main/cdk-github/src

If you use Github Actions, chances are you'll want to pass variables and secrets from your infrasturcture build to your Github Actions workflows, for example generated bucket and Lambda names. Once you're set up, you can use `npm run secrets` to read in values output by CDK deploy and use them to set up secrets and variables on Github automatically.

## Infrastructure setup and utilities

There are a bunch of example scripts and setup under https://github.com/davidcarboni/scloud/tree/main/infrastructure

A couple of key files are `dependencies.sh` (changes you may want to make to package.json) and `update.sh` (a usedul CDK deployment script). You'll also want to look at the `/secrets` directory - this is where you'll want to create `*.sh` files that can be sourced by `update.sh` to supply values to your infrastructure build.
