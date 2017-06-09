
'use strict';

var zlib = require('zlib');
var AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

const slackWebHookUrl = process.env.SLACK_HOOK_URL;
const slackChannel = process.env.SLACK_CHANNEL;
var hookUrl;

console.log('Loading function');

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  if (!hookUrl && slackWebHookUrl && slackWebHookUrl !== '') {
    const encryptedBuf = new Buffer(slackWebHookUrl, 'base64');
    const cipherText = { CiphertextBlob: encryptedBuf };
    const kms = new AWS.KMS({region:process.env.KMS_REGION});
    kms.decrypt(cipherText).promise().then(function(data) {
      hookUrl = `https://${data.Plaintext.toString('ascii')}`;
    }).catch(function(err) {
      console.log('Decrypt error, so just use raw hook url:', err);
      hookUrl = `https://${slackWebHookUrl}`;
    }).then(function(data) {
      alert(event.Records, 0, function(err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, `Successfully processed ${event.Records.length} records.`);
        }
      });
    });
  }
  else {
    alert(event.Records, 0, function(err, data) {
      if (err) {
        callback(err, null);
      }
      else {
        callback(null, `Successfully processed ${event.Records.length} records.`);
      }
    });
  }
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
      sendSlackMessage(decompressed.logEvents, 0, decompressed.logGroup, function(err, data) {
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

function sendSlackMessage(logEvents, idx, logGroup, callback) {
  var logEvent = logEvents[idx];
  var logMessage = null;
  try {
    logMessage = JSON.parse(logEvent.message);
  }
  catch(err) {
    console.log(`JSON parse error in [${logEvent.message}]`);
    return callback(null, false);
  }
  var message = buildMessage(logMessage.awsid, logMessage.subject, logMessage.message, logMessage.images);
  if (hookUrl) {
    // Container reuse, simply process the event with the key in memory
    processEvent(message, function(err, data) {
      if (err) {
        console.log("failed to send logEvents[" + idx + "] to Slack : " + err);
        callback(err, null);
      }
      else {
        if (++idx == logEvents.length) {
          callback(null, true);
        }
        else {
          sendSlackMessage(logEvents, idx, logGroup, callback);
        }
      }
    });
  }
  else {
    callback('Hook URL has not been set.');
  }
}

function postMessage(message, callback) {
  const body = JSON.stringify(message);
  console.log(hookUrl);
  const options = url.parse(hookUrl);
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };
  const postReq = https.request(options, (res) => {
    const chunks = [];
    res.setEncoding('utf8');
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      if (callback) {
        callback({
          body: chunks.join(''),
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
        });
      }
    });
    return res;
  });

  postReq.write(body);
  postReq.end();
}

function processEvent(slackMessage, callback) {
  slackMessage.channel = slackChannel;
  postMessage(slackMessage, (response) => {
    if (response.statusCode < 400) {
      console.info('Message posted successfully');
      callback(null, null);
    } else if (response.statusCode < 500) {
      console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
      callback(null, null);  // Don't retry because the error is due to a problem with the request
    } else {
      // Let Lambda retry
      callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
    }
  });
}

function buildMessage(accountId, subject, message, images) {
  var message = {
    icon_emoji: ":postbox:",
    "text": subject,
    "attachments": [
      {
        "text": message,
        "color": "warning",
        "fields": [
          {
              "title": "Account Id",
              "value": accountId,
              "short": true
          },
          /*{
              "title": "Account Name",
              "value": params.account.name,
              "short": true
          }*/
        ],
        "author_name": "Sungard Availability Services",
        "footer": "Created By SungardAS/aws-services",
        "footer_icon": "https://raw.githubusercontent.com/SungardAS/aws-services-lib/master/docs/images/logo.png",
        //"ts": (new Date(params.account.createdAt)).getTime()
      }
    ]
  };
  if (images) {
    images.forEach(function(image) {
      message.attachments.push({
        "image_url": image,
        "color": "warning"
      });
    });
  }
  return message;
}
