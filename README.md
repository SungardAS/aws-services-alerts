
# Unified Serverless Alert System

Serverless Central System to Manage All Different Kinds of Alerts

![aws-services][aws-services-image]

## How To Setup a CodePipeline

Use `codepipeline.yaml` template to create a stack

Input Parameter Values

- AlertMessageDynamoDBTableName:

  Enter DynamoDB table name to store alert messages.

- AlertTopicSubEndpointForCTO:

  Enter Email Address who will receive alert emails related with CTO Team.

- CloudWatchLogDestinationName: Alert Kinesis Destination Name

- CustomAuthorizerIAMRoleName: Leave empty

- CustomAuthorizerLambdaName: Leave empty

- EncryptionLambdaName:

  Enter the `NAME (not ARN) of the encryption Lambda Function`. If you didn't already deployed the Encryption Lambda Function, see <a href="https://github.com/SungardAS/aws-services-encryption">here</a> to deploy the Lambda Function to Encrypt Environment Variables.

- GitHubPersonalAccessToken:

  `Access Token` for CodeBuild to access to the this Github repository. (See <a href="https://help.github.com/articles/creating-an-access-token-for-command-line-use/">here</a> to find how to generate the access token).

- GitHubSourceRepositoryBranch: `develop`

- GitHubSourceRepositoryName: `aws-services-alerts`

- GitHubSourceRepositoryOwner: `SungardAS`

- ProjectImage: `aws/codebuild/nodejs:8.11.0`

- SlackChannel: Slack Channel Name

- SlackWebHookUrl: Slack Webhook Url without 'https://'

release6.1
- ProjectImage: `aws/codebuild/nodejs:8.11.0`

- TeamsWebHookUrl: Teams Webhook Url without 'https://'


## How To Test Lambda Function

After populating the const variables in test.js, run below command

    $ node tests/test.js

## [![Sungard Availability Services | Labs][labs-logo]][labs-github-url]

This project is maintained by the Labs group at [Sungard Availability
Services](http://sungardas.com)

GitHub: [https://sungardas.github.io](https://sungardas.github.io)

Blog:
[http://blog.sungardas.com/CTOLabs/](http://blog.sungardas.com/CTOLabs/)

[labs-github-url]: https://sungardas.github.io
[labs-logo]: https://raw.githubusercontent.com/SungardAS/repo-assets/master/images/logos/sungardas-labs-logo-small.png
[aws-services-image]: ./docs/images/logo.png?raw=true
