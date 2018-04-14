
'use strict';

var zlib = require('zlib');
var AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

const teamsWebHookUrl = process.env.TEAMS_HOOK_URL;
var hookUrl;

console.log('Loading function');

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  if (!hookUrl && teamsWebHookUrl && teamsWebHookUrl !== '') {
    const encryptedBuf = new Buffer(teamsWebHookUrl, 'base64');
    const cipherText = { CiphertextBlob: encryptedBuf };
    const kms = new AWS.KMS({region:process.env.KMS_REGION});
    kms.decrypt(cipherText).promise().then(function(data) {
      hookUrl = `https://${data.Plaintext.toString('ascii')}`;
    }).catch(function(err) {
      console.log('Decrypt error, so just use raw hook url:', err);
      hookUrl = `https://${teamsWebHookUrl}`;
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
      sendTeamsMessage(decompressed.logEvents, 0, decompressed.logGroup, function(err, data) {
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

function sendTeamsMessage(logEvents, idx, logGroup, callback) {
  var logEvent = logEvents[idx];
  var logMessage = null;
  try {
    logMessage = JSON.parse(logEvent.message);
  }
  catch(err) {
    console.log(`JSON parse error in [${logEvent.message}]`);
    return callback(null, false);
  }
  var message = buildMessage(logMessage.awsid, logMessage.subject, logMessage.message, logMessage.images, logMessage.titles);
  if (hookUrl) {
    // Container reuse, simply process the event with the key in memory
    processEvent(message, function(err, data) {
      if (err) {
        console.log("failed to send logEvents[" + idx + "] to Teams : " + err);
        callback(err, null);
      }
      else {
        if (++idx == logEvents.length) {
          callback(null, true);
        }
        else {
          sendTeamsMessage(logEvents, idx, logGroup, callback);
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

function processEvent(teamsMessage, callback) {
  postMessage(teamsMessage, (response) => {
    if (response.statusCode < 400) {
      console.info('Message posted successfully');
      callback(null, null);
    } else if (response.statusCode < 500) {
      console.error(`Error posting message to Teams API: ${response.statusCode} - ${response.statusMessage}`);
      callback(null, null);  // Don't retry because the error is due to a problem with the request
    } else {
      // Let Lambda retry
      callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
    }
  });
}

function buildMessage(accountId, subject, message, images, titles) {
  var message = {
    "summary": "Alert Card",
    "themeColor": "0078D7",
    "title": subject,
    "sections": [
      {
        "activityTitle": "Created By SungardAS/aws-services",
        "activitySubtitle": (new Date()).toString(),
        "activityImage": "https://raw.githubusercontent.com/SungardAS/aws-services-lib/master/docs/images/logo.png",
        "facts": [
          {
            "name": "Account Id",
            "value": accountId
          }
        ],
        "text": message
      }
    ]
  };

  if (titles) {
    titles.forEach(function(title) {
      console.log(title);
      message.sections[0].facts.push({"name": title.title, "value": title.value});
    });
  }

  if (images) {
    images.forEach(function(image) {
      message.sections.push({
        "images": [
          {
            "image": image,
            "title": ""
          }
        ],
        "facts": [
          {
              "name": "Attachments",
              "value": `[aa](${image})`
          }
        ]
      });
    });
  };

  return message;
}
