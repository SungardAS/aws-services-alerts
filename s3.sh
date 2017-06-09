#!/bin/sh

if [ "$S3_SHARED_BUCKET_NAME" != "" ];
then
  aws s3 cp `./src/node_modules/yaml-cli/libexec/yaml get samTemplate.yaml Resources.LambdaFunction.Properties.CodeUri` s3://$S3_SHARED_BUCKET_NAME  --acl public-read
  sed -i "s/$S3_BUCKET_NAME/$S3_SHARED_BUCKET_NAME/g" samTemplate.yaml
  aws s3 cp ./samTemplate.yaml s3://$S3_SHARED_BUCKET_NAME/`python -c 'import uuid; print str(uuid.uuid1())'`.yaml --acl public-read
fi
