var app = remoteRequire('app');
var request = require('request');
var crypto = require('crypto');

var remote;
try {
  remote = require('remote');
} catch(e) {
}

var uuid = function() {
  var id = '';

  for (var i = 0; i < 8; i++) {
    id += Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return id;
};

var getUserDataPath = function() {
  return app.getPath('userData');
};

var getPlatform = function() {
  if (remote) {
    return remote.process.platform;
  }
  return process.platform;
};

var authRequest = function(method, host, path, token, secret, jsonData,
    callback) {
  method = method.toUpperCase();

  var authTimestamp = Math.floor(new Date().getTime() / 1000).toString();
  var authNonce = uuid();
  var authString = [token, authTimestamp, authNonce, method, path];

  var data;
  if (jsonData) {
    data = JSON.stringify(jsonData);
    authString.push(data);
  }

  authString = authString.join('&');

  var authSignature = crypto.createHmac('sha256', secret).update(
    authString).digest('base64');

  var headers = {
    'Auth-Token': token,
    'Auth-Timestamp': authTimestamp,
    'Auth-Nonce': authNonce,
    'Auth-Signature': authSignature,
  };
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  request({
    method: method,
    url: host + path,
    json: data ? true : undefined,
    body: data,
    headers: headers,
    strictSSL: false
  }, function(err, resp, body) {
    if (callback) {
      callback(err, resp, body);
    }
  });
};

function WaitGroup() {
  this.count = 0;
  this.waiter = null;
}

WaitGroup.prototype.add = function(count) {
  this.count += count || 1;
};

WaitGroup.prototype.done = function() {
  this.count -= 1;
  if (this.count <= 0) {
    if (this.waiter) {
      this.waiter();
    }
  }
};

WaitGroup.prototype.wait = function(callback) {
  if (this.count === 0) {
    callback();
  } else {
    this.waiter = callback;
  }
};

module.exports = {
  uuid: uuid,
  getUserDataPath: getUserDataPath,
  authRequest: authRequest,
  getPlatform: getPlatform,
  WaitGroup: WaitGroup
};
