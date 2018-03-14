// From https://bitfinex.readme.io/v1/docs/rest-auth
const superagent = require('superagent-use')(require('superagent'));
const crypto = require('crypto');
const { get } = require('lodash');

superagent.use(require('superagent-verbose-errors'));

const baseUrl = 'https://api.bitfinex.com';

const createBitfinexClient = (apiKey, apiSecret) => {
  return async (url, fields = {}) => {
    const nonce = Date.now().toString();
    const completeURL = baseUrl + url;

    const body = {
      request: url,
      nonce,
      ...fields,
    };

    const payload = new Buffer(JSON.stringify(body)).toString('base64');

    const signature = crypto
      .createHmac('sha384', apiSecret)
      .update(payload)
      .digest('hex');

    const requestPromise = superagent
      .post(completeURL)
      .set('X-BFX-APIKEY', apiKey)
      .set('X-BFX-PAYLOAD', payload)
      .set('X-BFX-SIGNATURE', signature)
      .send(JSON.stringify(body));

    const response = await requestPromise;
    return response.body;
  };
};

module.exports = createBitfinexClient;
