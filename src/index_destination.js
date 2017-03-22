
var AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  var fs = require("fs");
  var policyDoc = fs.readFileSync(__dirname + '/json/policy.json', {encoding:'utf8'});
  policyJson = JSON.parse(policyDoc);
  policyJson.Statement[0].Principal.AWS = event.accounts.split(',');
  policyJson.Statement[0].Resource = "arn:aws:logs:" + process.env.AWS_DEFAULT_REGION + ":" + process.env.ACCOUNT_ID + ":destination:" + process.env.DESTINATION_NAME;
  var policyStr = JSON.stringify(policyJson);
  console.log(policyStr);

  var ec2Main = new AWS.EC2({region:process.env.AWS_DEFAULT_REGION});
  ec2Main.describeRegions({}).promise().then(function(data) {
    var regions = [];
    data.Regions.map(function(region) {
      regions.push(region.RegionName);
    });
    return regions;
  }).then(function(regions) {
    var promises = [];
    regions.forEach(function(region) {
      promises.push(putDestination(event, region, policyStr));
    });
    var result = [];
    return Promise.all(promises).then(function(retArray) {
      retArray.forEach(function(ret, idx) {
        result.push({region: regions[idx], result: ret});
      });
      return callback(null, result);
    }).catch(function(err) {
      return callback(err, null);
    });
  }).catch(function(err) {
    return callback(err, null);
  });
}

function putDestination(event, region, policyStr) {
  var cloudwatchlogs = new AWS.CloudWatchLogs({region: region});
  params = {
    destinationName: process.env.DESTINATION_NAME,
    roleArn: process.env.ROLE_ARN,
    targetArn: process.env.TARGET_ARN,
  };
  return cloudwatchlogs.putDestination(params).promise().then(function(data) {
    params = {
      accessPolicy: policyStr,
      destinationName: process.env.DESTINATION_NAME
    };
    return cloudwatchlogs.putDestinationPolicy(params).promise().then(function(data) {
      console.log("Successfully created destination and add a policy in region " + region);
      return Promise.resolve(true);
    }).catch(function(err) {
      console.log("failed to add a policy in region " + region + " : " + err);
      return Promise.reject(err);
    });
  }).catch(function(err) {
    console.log("failed to create destination in region " + region + " : " + err);
    return Promise.reject(err);
  });
}
