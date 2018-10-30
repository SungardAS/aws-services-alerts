
'use strict';

var zlib = require('zlib');
var AWS = require('aws-sdk');

console.log('Loading function');

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  alert(event.Records, 0, function(err, data) {
    if (err) {
      callback(err, null);
    }
    else {
      callback(null, `Successfully processed ${event.Records.length} records.`);
    }
  });
};

function alert(records, idx, callback) {
  var record = records[idx];
  // Kinesis data is base64 encoded so decode here
  console.log('raw payload:', record.kinesis.data);
  const payload = new Buffer(record.kinesis.data, 'base64');
  console.log('Decoded payload:', payload);
  zlib.gunzip(payload, function (err, data) {
    if (err)    callback(err);
    else {
      var str = data.toString();
      console.log(`Decompressed record - ${str}`);
      const decompressed = JSON.parse(str);
      publish(decompressed.logEvents, 0, decompressed.logGroup, function(err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          if (++idx == records.length) {
            callback(null, true);
          }
          else {
            alert(records, idx, callback);
          }
        }
      });
    }
  });
}

function publish(logEvents, idx, logGroup, callback) {

  var region = process.env.AWS_DEFAULT_REGION;
  var sns = new AWS.SNS({region: region});
  var topicArn = process.env.SNS_TOPIC_ARN

  var current = new Date();
  var logEvent = logEvents[idx];
  var logMessage = null;
  try {
    logMessage = JSON.parse(logEvent.message);
  }
  catch(err) {
    console.log(`JSON parse error in [${logEvent.message}]`);
    return callback(null, false);
  }
  if (logMessage.images) {
    logMessage.message += "\n\nPlease review below for more detail.";
    logMessage.images.forEach(function(image) {
      logMessage.message += `\n${image}`;
    });
  }

  var params = {
    Message: logMessage.message,
    MessageAttributes: {
      "awsid": {
        DataType: 'String',
        StringValue: logMessage.awsid
      }
    },
    //MessageStructure: 'STRING_VALUE',
    Subject: logMessage.subject,
    //TargetArn: 'STRING_VALUE',
    TopicArn: topicArn
  };
  console.log(params);

  sns.publish(params, function(err, data) {
    if (err) {
      console.log("failed to publish logEvents[" + idx + "] : " + err);
      callback(err, null);
    }
    else {
      if (++idx == logEvents.length) {
        callback(null, true);
      }
      else {
        publish(logEvents, idx, logGroup, callback);
      }
    }
  });
}
