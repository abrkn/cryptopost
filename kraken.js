const querystring = require('querystring');
const { createHmac, createHash } = require('crypto');
const assert = require('assert');
const request = require('superagent');

const createKrakenClient = (apiKey, apiSecret) => {
  const apiSecretBuffer = new Buffer(apiSecret, 'base64');

  const krakenPost = async (path, fields) => {
    const nonce = (+new Date() * 1e3).toString();
    const requestBody = querystring.stringify(Object.assign({ nonce }, fields));
    const hash = createHash('sha256')
      .update(nonce)
      .update(requestBody)
      .digest();
    const signature = createHmac('sha512', apiSecretBuffer)
      .update(path)
      .update(hash)
      .digest('base64');

    const response = await request
      .post(`https://api.kraken.com${path}`)
      .set('API-Key', apiKey)
      .set('API-Sign', signature)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Content-Length', requestBody.length)
      .send(requestBody);

    const { body } = response;
    const { error } = body;

    if (error && error.length) {
      throw new Error(`Kraken error: ${error[0]}`);
    }

    const { result } = body;
    assert(result);
    return result;
  };

  return krakenPost;
};

module.exports = createKrakenClient;
