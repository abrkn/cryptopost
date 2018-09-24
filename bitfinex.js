// From https://bitfinex.readme.io/v1/docs/rest-auth
const superagent = require('superagent-use')(require('superagent'));
const crypto = require('crypto');
const assert = require('assert');

superagent.use(require('superagent-verbose-errors'));

const baseUrl = 'https://api.bitfinex.com';

const createBitfinexClient = (...args) => {
  const nextKeyPair = typeof args[0] === 'function' ? args[0] : () => args.slice(0, 2);

  return async (url, fields = {}) => {
    const nonce = Date.now().toString();
    const completeURL = baseUrl + url;

    const requestBody = {
      request: url,
      nonce,
      ...fields,
    };

    const requestBodyStringified = JSON.stringify(requestBody);

    const requestBodyEncoded = new Buffer(requestBodyStringified).toString('base64');

    const [apiKey, apiSecret] = nextKeyPair();
    assert(apiKey);
    assert(apiSecret);

    const signature = crypto
      .createHmac('sha384', apiSecret)
      .update(requestBodyEncoded)
      .digest('hex');

    const requestPromise = superagent
      .post(completeURL)
      .set('X-BFX-APIKEY', apiKey)
      .set('X-BFX-PAYLOAD', requestBodyEncoded)
      .set('X-BFX-SIGNATURE', signature)
      .send(requestBodyStringified);

    const response = await requestPromise;

    const { body } = response;
    assert(body, `body missing from response: ${response.text}`);

    // Certain responses (like deposit, withdraw) have a result field, which is
    // set to either "success" or "error"
    if (body.result !== undefined) {
      if (body.result === 'error') {
        let message;

        // address	[string]	The deposit address (or error message if result = “error”)
        // https://docs.bitfinex.com/v1/reference#rest-auth-deposit
        if (url === '/v1/deposit/new') {
          message = body.address;
        } else {
          message = body.message;
        }

        if (!message) {
          message = JSON.stringify(body);
        }

        throw new Error(`Request failed (result equals error): ${message}`);
      } else if (body.result !== 'success') {
        throw new Error(`Unexpected result field value, "${body.result}"`);
      }
    }

    return body;
  };
};

module.exports = createBitfinexClient;
