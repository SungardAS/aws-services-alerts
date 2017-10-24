
'use strict';

var AWS = require('aws-sdk');
var zlib = require('zlib');

var region = process.env.AWS_DEFAULT_REGION;
var tableName = process.env.DYNAMODB_TABLE_NAME;
var documentClient = new AWS.DynamoDB.DocumentClient({region: region});

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
      save(decompressed.logEvents, 0, decompressed.logGroup, function(err, data) {
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

function save(logEvents, idx, logGroup, callback) {

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
  logMessage["id"] = logEvent.id;
  logMessage["createdAt"] = current.toISOString();
  logMessage["updatedAt"] = current.toISOString();
  logMessage["source"] = logGroup;
  console.log(logMessage);

  var params = {
    Item: logMessage,
    TableName: tableName,
    ReturnConsumedCapacity: "TOTAL",
    ReturnItemCollectionMetrics: "SIZE"
    //ReturnValues: NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW
  };
  documentClient.put(params, function(err, data) {
    if (err) {
      console.log("failed to save logEvents[" + idx + "] : " + err);
      callback(err, null);
    }
    else {
      if (++idx == logEvents.length) {
        callback(null, idx);
      }
      else {
        save(logEvents, idx, logGroup, callback);
      }
    }
  });
}
