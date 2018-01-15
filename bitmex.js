const assert = require('assert');
const { createHmac } = require('crypto');
const querystring = require('querystring');
const request = require('superagent');

const BITMEX_BASE_URL = 'https://www.bitmex.com';

const createBitmexClient = (apiKey, apiSecret) => {
  const bitmexRequest = async (verb, path, query, payload) => {
    const queryStringified = query ? `?${querystring.stringify(query)}` : '';
    const pathWithQuery = `${path}${queryStringified}`;
    const payloadString = payload ? JSON.stringify(payload) : '';
    const expires = (+new Date() + 1000 * 60).toString();
    const signatureInput = [verb, pathWithQuery, expires, payloadString].join(
      ''
    );
    const signature = createHmac('sha256', apiSecret)
      .update(signatureInput)
      .digest('hex');

    const requestForVerb = request[verb.toLowerCase()];

    const promise = requestForVerb(`${BITMEX_BASE_URL}${pathWithQuery}`)
      .set('api-expires', expires)
      .set('api-key', apiKey)
      .set('api-signature', signature)
      .set('user-agent', 'PnL Updater - Helix Capital - https://helix.capital');

    let response;

    if (payloadString.length) {
      response = await promise
        .set('content-type', 'application/json')
        .send(payloadString);
    } else {
      response = await promise;
    }

    const { body } = response;
    const { error } = body;

    if (error) {
      throw new Error(error.message);
    }

    return body;
  };

  return bitmexRequest;
};

module.exports = createBitmexClient;
