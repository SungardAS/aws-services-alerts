
var AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  var cloudwatchlogs = new AWS.CloudWatchLogs({region: event.region});
  var params = {
    DestinationNamePrefix: event.destinationName
  };
  cloudwatchlogs.describeDestinations(params).promise().then(function(data) {
    if (data.destinations.length > 0 && data.destinations[0].destinationName == event.destinationName) {
      if (data.destinations[0].accessPolicy) {
        console.log(data);
        return callback(null, "destination already exists");
      }
      else {
        // attach a policy to destination
        putDestinationPolicy(cloudwatchlogs, event).then(function(data) {
          return callback(null, "destination already exists and policy has been added");
        }).catch(function(err) {
          return callback(err, null);
        });
      }
    }
    params = {
      destinationName: event.destinationName,
      roleArn: event.roleArn,
      targetArn: event.targetArn,
    };
    cloudwatchlogs.putDestination(params).promise().then(function(data) {
      putDestinationPolicy(cloudwatchlogs, event).then(function(data) {
        return callback(null, "Successfully created destination and add a policy");
      }).catch(function(err) {
        return callback(err, null);
      });
    }).catch(function(err) {
      return callback(err, null);
    });
  }).catch(function(err) {
    return callback(err, null);
  });
}

function putDestinationPolicy(cloudwatchlogs, event) {
  var params = {
    accessPolicy: event.policyStr,
    destinationName: event.destinationName
  };
  return cloudwatchlogs.putDestinationPolicy(params).promise();
}
