/* eslint-disable no-param-reassign */
import * as fs from 'fs';
import {
  CfnAccessKey, Conditions, ManagedPolicy, OpenIdConnectProvider, PolicyStatement, Role, User, WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { IRepository } from 'aws-cdk-lib/aws-ecr';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IFargateService } from 'aws-cdk-lib/aws-ecs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import _ from 'lodash';

const ghaInfo = {
  resources: {
    repositories: <IRepository[]>[],
    buckets: <IBucket[]>[],
    lambdas: <IFunction[]>[],
    services: <IFargateService[]>[],
    distributions: <IDistribution[]>[],
  },
  secrets: <string[]>[],
  variables: <string[]>[],
};

export function addGhaSecret(
  construct: Construct,
  name: string,
  value: string,
) {
  const cfnOutput = new CfnOutput(construct, name, { value });
  ghaInfo.secrets.push(cfnOutput.node.id);
}

export function addGhaVariable(
  construct: Construct,
  name: string,
  type: string,
  value: string,
) {
  const variableName = `${_.lowerFirst(name)}${_.capitalize(type)}`;
  const cfnOutput = new CfnOutput(construct, variableName, { value });
  ghaInfo.variables.push(cfnOutput.node.id);
}

export function addGhaLambda(
  construct: Construct,
  name: string,
  lambda: IFunction,
) {
  ghaInfo.resources.lambdas.push(lambda);
  addGhaVariable(construct, name, 'lambda', lambda.functionName);
}

export function addGhaBucket(
  construct: Construct,
  name: string,
  bucket: IBucket,
) {
  ghaInfo.resources.buckets.push(bucket);
  addGhaVariable(construct, name, 'bucket', bucket.bucketName);
}

export function addGhaDistribution(
  construct: Construct,
  name: string,
  distribution: IDistribution,
) {
  ghaInfo.resources.distributions.push(distribution);
  addGhaVariable(construct, name, 'distributionId', distribution.distributionId);
}

export function addGhaRepository(
  construct: Construct,
  name: string,
  repository: IRepository,
) {
  ghaInfo.resources.repositories.push(repository);
  addGhaVariable(construct, name, 'repository', repository.repositoryName);
}

export function saveGhaValues(stack: Stack) {
  if (fs.existsSync('secrets')) {
    // Write out the list of secret and variable names:
    fs.writeFileSync(`secrets/${stack.stackName}.ghaSecrets.json`, JSON.stringify(ghaInfo.secrets));
    fs.writeFileSync(`secrets/${stack.stackName}.ghaVariables.json`, JSON.stringify(ghaInfo.variables));
  }

  // Flush ghaInfo so we're free to build another stack if needed:
  ghaInfo.resources.buckets = [];
  ghaInfo.resources.distributions = [];
  ghaInfo.resources.lambdas = [];
  ghaInfo.resources.repositories = [];
  ghaInfo.resources.services = [];
  ghaInfo.secrets = [];
  ghaInfo.variables = [];
}

function addToPolicy(stack: Stack, name: string, policy: ManagedPolicy, resources: string[], actions: string[]) {
  if (resources.length > 0) {
    policy.addStatements(new PolicyStatement({
      actions,
      resources,
      sid: name,
    }));
  }
}

export function ghaPolicy(stack: Stack, name: string = `gha-${stack.stackName}-policy`) {
  const policy = new ManagedPolicy(stack, name, {
    managedPolicyName: name,
  });

  // ECR repositories - push/pull images
  const repositoryArns = ghaInfo.resources.repositories
    .filter((repository) => repository)
    .map((repository) => repository.repositoryArn);
  if (repositoryArns.length > 0) addToPolicy(stack, 'ecrLogin', policy, ['*'], ['ecr:GetAuthorizationToken']);
  addToPolicy(stack, 'ecrRepositories', policy, repositoryArns, [
    'ecr:GetDownloadUrlForLayer',
    'ecr:BatchGetImage',
    'ecr:BatchDeleteImage',
    'ecr:CompleteLayerUpload',
    'ecr:UploadLayerPart',
    'ecr:InitiateLayerUpload',
    'ecr:BatchCheckLayerAvailability',
    'ecr:PutImage',
    'ecr:ListImages',
  ]);

  // Buckets - upload/sync
  const bucketArns = ghaInfo.resources.buckets
    .filter((bucket) => bucket)
    .map((bucket) => bucket.bucketArn);
  addToPolicy(stack, 'buckets', policy, bucketArns, [
    's3:ListBucket',
  ]);
  const objectArns = bucketArns.map((arn) => `${arn}/*`);
  addToPolicy(stack, 'bucketObjects', policy, objectArns, [
    's3:PutObject',
    's3:DeleteObject',
  ]);

  // Lambdas - update update with a new zip/container build
  const lambdaArns = ghaInfo.resources.lambdas
    .filter((lambda) => lambda)
    .map((lambda) => lambda.functionArn);
  addToPolicy(stack, 'lambdas', policy, lambdaArns, [
    'lambda:UpdateFunctionCode',
    // 'lambda:PublishVersion',
  ]);

  // Fargate services - update with a new container build
  const serviceArns = ghaInfo.resources.services
    .filter((service) => service)
    .map((service) => service.serviceArn);
  addToPolicy(stack, 'fargateServices', policy, serviceArns, [
    'ecs:UpdateService',
  ]);

  // Cloudfront distribution - cache invalidation
  const distributionArns = ghaInfo.resources.distributions
    .filter((distribution) => distribution !== undefined)
    // Not sure where to 'properly' get a distribution ARN from?
    .map((distribution) => `arn:aws:cloudfront::${stack.account}:distribution/${distribution.distributionId}`);
  addToPolicy(stack, 'distributions', policy, distributionArns, [
    'cloudfront:CreateInvalidation',
  ]);

  if (fs.existsSync('secrets')) {
    // Write out the list of secret and variable names:
    fs.writeFileSync(`secrets/${stack.stackName}.ghaSecrets.json`, JSON.stringify(ghaInfo.secrets));
    fs.writeFileSync(`secrets/${stack.stackName}.ghaVariables.json`, JSON.stringify(ghaInfo.variables));
  }

  return policy;
}

/**
 * Create an OIDC connection fo Guthub Actions.
 * NB only one OIDC provider for GitHub can be created per AWS account because (the provider URL must be unique).
 * To provide access to resources, you can create multiple roles that trust the provider so you'll probably want to call ghaOidcRole() instead.
 * See: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
 * @param repo What to grant access to. This is a minimum of a GitHub owner (user or org), optionally a repository name, and you can also specify a filter to limit access to e.g. a branch.
 */
export function ghaOidc(stack: Stack, repo: { owner: string, name?: string; filter?: string; }) {
  const ghProvider = new OpenIdConnectProvider(stack, `gha-oidc-${stack.account}`, {
    url: 'https://token.actions.githubusercontent.com',
    clientIds: ['sts.amazonaws.com'],
  });

  // grant only requests coming from the specific owner/repository/filter.
  let condition = `repo:${repo.owner}/*`;
  if (repo.name) {
    condition = `repo:${repo.owner}/${repo.name}:${repo.filter || '*'}`;
  }
  const conditions: Conditions = {
    StringLike: {
      'token.actions.githubusercontent.com:sub': [condition],
    },
  };

  const role = new Role(stack, `gha-oidc-role-${stack.account}`, {
    assumedBy: new WebIdentityPrincipal(
      ghProvider.openIdConnectProviderArn,
      conditions,
    ),
    managedPolicies: [
      ghaPolicy(stack),
    ],
    roleName: `gha-oidc-${stack.stackName}`,
    description: `Role for GitHub Actions (${stack.stackName}) to assume when deploying to AWS`,
  });
  addGhaVariable(stack, 'ghaOidc', 'Role', role.roleName);

  saveGhaValues(stack);
}

/**
 * Add permissions to the GitHub OIDC role that allow workflows to access the AWS resources in this stack that need to be updated at build time.
 * See: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
 * @param repo The repository to grant access to (owner and name). You can also specify a filter to limit access e.g. to a branch.
 */
export function ghaOidcRole(stack: Stack) {
  const role = Role.fromRoleName(stack, 'gha-oidc-role', `gha-oidc-${stack.stackName}`);
  const policy = ghaPolicy(stack);
  role.addManagedPolicy(policy);
  addGhaVariable(stack, 'ghaOidc', 'Role', role.roleName);

  saveGhaValues(stack);
}

/**
 * A user for Gihud Actions CI/CD.
 */
export function ghaUser(stack: Stack): { user: User, accessKey: CfnAccessKey | undefined; } {
  // A user with the policy attached
  const user = new User(stack, 'ghaUser', { userName: `gha-${stack.stackName}` });
  const policy = ghaPolicy(stack);
  user.addManagedPolicy(policy);

  // Credentials
  let accessKey: CfnAccessKey | undefined;
  if (!process.env.REKEY) {
    accessKey = new CfnAccessKey(stack, 'ghaUserAccessKey', {
      userName: user.userName,
    });

    // Access key details for GHA secrets
    addGhaSecret(stack, 'awsAccessKeyId', accessKey.ref);
    addGhaSecret(stack, 'awsSecretAccessKey', accessKey.attrSecretAccessKey);
  }

  saveGhaValues(stack);
  return { user, accessKey };
}
