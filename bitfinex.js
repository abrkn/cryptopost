// From https://bitfinex.readme.io/v1/docs/rest-auth
const request = require('superagent');
const crypto = require('crypto');

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

    const response = await request
      .post(completeURL)
      .set('X-BFX-APIKEY', apiKey)
      .set('X-BFX-PAYLOAD', payload)
      .set('X-BFX-SIGNATURE', signature)
      .send(JSON.stringify(body));

    return response.body;
  };
};

module.exports = createBitfinexClient;
