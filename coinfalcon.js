// From https://docs.coinfalcon.com/#authentication
// const superagent = require('superagent-use')(require('superagent'));
const superagent = require('superagent');
const crypto = require('crypto');
const assert = require('assert');

// superagent.use(require('superagent-verbose-errors'));

const baseUrl = 'https://coinfalcon.com';

const createCoinFalconClient = (apiKey, apiSecret) => {
  const getHeaders = (method, pathWithQuery, body) => {
    assert(method, 'method');
    assert(pathWithQuery, 'pathWithQuery');

    const timestamp = Math.floor(new Date() / 1e3);
    const payload = [timestamp, method.toUpperCase(), pathWithQuery];

    if (body) {
      payload.push(JSON.stringify(body));
    }

    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(payload.join('|'))
      .digest('hex');

    return {
      'CF-API-KEY': apiKey,
      'CF-API-TIMESTAMP': timestamp,
      'CF-API-SIGNATURE': signature,
    };
  };

  const request = async (method, path, body) => {
    let chain = superagent(method, baseUrl + path).set(getHeaders(method, path, body));

    if (body) {
      chain = chain.send(body);
    }

    const { body: { error, data } } = await chain;

    if (error) {
      throw new Error(`Coinfalcon: ${error}`);
    }

    return data;
  };

  return { getHeaders, baseUrl, request };
};

module.exports = createCoinFalconClient;
