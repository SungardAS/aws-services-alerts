
source .env.local

cd src; npm install; cd ..

aws cloudformation package \
   --template-file ./template.yaml \
   --s3-bucket $S3_BUCKET_NAME \
   --output-template-file samTemplate.yaml

aws cloudformation deploy --template-file ./samTemplate.yaml \
  --capabilities CAPABILITY_IAM \
  --stack-name SungardAS-aws-services-alerts \
  --parameter-overrides CloudWatchLogDestinationName=$CLOUDWATCHLOG_DESTINATION_NAME \
  AlertMessageDynamoDBTableName=$ALERT_MESSAGE_DYNAMODB_TABLE_NAME \
  SlackWebHookUrl=$SLACK_WEBHOOK_URL SlackChannel=$SLACK_CHANNEL \
  TeamsWebHookUrl=$TEAM_WEBHOOK_URL AlertTopicSubEndpointForCTO=$ALERT_TOPIC_SUB_ENDPOINT_FOR_CTO
