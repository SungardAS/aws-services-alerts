
var AWS = require('aws-sdk');
var uuid = require('node-uuid');

var groupName = process.env.SAMPLE_LOG_GROUP_NAME;

exports.handler = function (event, context, callback) {

  var message = `This is a sample alert from a blog`;
  var sentAt = (new Date()).toISOString();
  var logMessage = {
    "awsid": context.invokedFunctionArn.split(":")[4],
    "region": process.env.AWS_DEFAULT_REGION,
    "subject": "A new alert has been simulated",
    "message": message,
    "sentBy": context.invokedFunctionArn,
    "sentAt": sentAt
  };
  var streamName = sentAt.replace(/:/g, '') + "-" + uuid.v4();

  var cloudwatchlogs = new AWS.CloudWatchLogs({region: process.env.AWS_DEFAULT_REGION});
  var params = {
    limit: 1,
    logGroupNamePrefix: groupName,
    //nextToken: 'STRING_VALUE'
  };
  return cloudwatchlogs.describeLogGroups(params).promise().then(function(data) {
    if (data.logGroups[0]) {
      console.log("found a log group");
      console.log(data.logGroups[0]);
      return data.logGroups[0];
    }
    else {
      console.log("log group '" + groupName + "' not found");
      return callback("log group '" + groupName + "' not found");
     }
  }).then(function(data) {
    params = {
      logGroupName: groupName,
      logStreamName: streamName
    };
    console.log(params);
    return cloudwatchlogs.createLogStream(params).promise().then(function(data) {
      console.log("LogStream created");
      return data;
    }).catch(function(err) {
      console.log("createLogStream failed: " + err);
      return callback(err);
    })
  }).then(function(data) {
    params = {
      logGroupName: groupName,
      logStreamName: streamName,
      logEvents: [ {
        message: JSON.stringify(logMessage),
        timestamp: (new Date()).getTime()
      } ]
    };
    console.log(params);
    return cloudwatchlogs.putLogEvents(params).promise().then(function(data) {
      console.log("LogEvents created");
      return callback(null, logMessage);
    }).catch(function(err) {
      console.log("putLogEvents failed: " + err);
      return callback(err);
    })
  }).catch(function(err) {
    console.log("describeLogGroups failed: " + err);
    return callback(err);
  });
}
