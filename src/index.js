
'use strict';

var zlib = require('zlib');
var dynamodb = new (require('aws-services-lib/aws/dynamodb.js'))();

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
      const decompressed = JSON.parse(data.toString('ascii'));
      console.log(`Decompressed record - ${JSON.stringify(decompressed)}`);
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

  var region = process.env.AWS_DEFAULT_REGION;
  var tableName = process.env.DYNAMODB_TABLE_NAME;

  var current = new Date();
  var logEvent = logEvents[idx];
  var message = null;
  try {
    message = JSON.parse(logEvent.message);
  }
  catch(err) {
    console.log(`JSON parse error in [${logEvent.message}]`);
    return callback(null, false);
  }
  var item = {
      "id": {"S": logEvent.id},
      "awsid": {"S": message.awsid},
      "subject": {"S": message.subject},
      "message": {"S": message.message},
      "sentBy": {"S": message.sentBy},
      "sentAt": {"S": message.sentAt},
      "createdAt": {"S": current.toISOString()},
      "updatedAt": {"S": current.toISOString()},
      "account": {"N": '0'},
      "archivedBy": {"S": "none"},
      "source": {"S": logGroup},
      //"sequenceNumber": {"S": record.dynamodb.SequenceNumber}
  }
  console.log(item);

  var input = {
    region: region,
    tableName: tableName,
    item: item
  };

  dynamodb.save(input, function(err, data) {
    if (err) {
      console.log("failed to save logEvents[" + idx + "] : " + err);
      callback(err, null);
    }
    else {
      if (++idx == logEvents.length) {
        callback(null, true);
      }
      else {
        save(logEvents, idx, logGroup, callback);
      }
    }
  });
}
