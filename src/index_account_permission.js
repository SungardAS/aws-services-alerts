
var AWS = require('aws-sdk');

exports.handler = function (event, context) {

  console.log(JSON.stringify(event));

  var region = event.region;
  var account = event.account;
  var destinationName = event.destinationName;

  // find destination in the given region
  var cloudwatchlogs = new AWS.CloudWatchLogs({region: region});
  params = {
    DestinationNamePrefix: destinationName
  };
  return cloudwatchlogs.describeDestinations(params).promise().then(function(data) {
    if (data && data.destinations.length > 0) {
      console.log("found destination in region, " + region + " : " + JSON.stringify(data));
      if (data.destinations[0].accessPolicy) {
        return data.destinations[0];
      }
      else {
        var err = "no destination found";
        throw err;
      }
    }
    else {
      var err = "no destination found";
      throw err;
    }
  }).then(function(destination) {
    var accessPolicyDocument = JSON.parse(destination.accessPolicy);
    if (accessPolicyDocument.Statement[0].Principal.AWS.indexOf(account) < 0) {
      accessPolicyDocument.Statement[0].Principal.AWS.push(account);
    }
    destination.accessPolicy = JSON.stringify(accessPolicyDocument);
    console.log("updated accessPolicy: " + JSON.stringify(destination.accessPolicy));
    return destination;
  }).then(function(destination) {
    var params = {
      accessPolicy: destination.accessPolicy,
      destinationName: destination.destinationName
    };
    return cloudwatchlogs.putDestinationPolicy(params).promise().then(function(data) {
      console.log("completed to cloudwatchlogs.putDestinationPolicy in region, " + region);
      return context.done(null, true);
    }).catch(function(err) {
      console.log("failed to put a destination policy in region, " + region + ": " + err);
      throw err;
    });
  }).catch(function(err) {
    console.log(err);
    return context.fail(err, null);
  });
}
