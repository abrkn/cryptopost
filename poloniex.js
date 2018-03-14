const assert = require('assert');
const { createHmac } = require('crypto');
const request = require('superagent');

const createPoloniexRequest = (apiKey, apiSecret) => {
  assert(apiKey);
  assert(apiSecret);

  const apiSecretAsBuffer = new Buffer(apiSecret);

  const poloniexPost = (path, fields) => {
    const fieldsWithNonce = {
      nonce: +new Date(),
      ...fields,
    };

    const requestBody = Object.keys(fieldsWithNonce)
      .map(key => `${key}=${fieldsWithNonce[key]}`)
      .join('&');

    const signature = createHmac('sha512', apiSecretAsBuffer)
      .update(requestBody)
      .digest('hex');

    return request
      .post(`https://poloniex.com${path}`)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Content-Length', requestBody.length)
      .set('Key', apiKey)
      .set('Sign', signature)
      .send(requestBody)
      .then(response => {
        const { body } = response;
        const { error } = body;

        if (error) {
          throw new Error(`Poloniex error: ${error}`);
        }

        return body;
      });
  };

  return poloniexPost;
};

module.exports = createPoloniexRequest;
