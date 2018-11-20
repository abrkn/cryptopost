// From https://github.com/coinexcom/coinex_exchange_api/wiki/012security_authorization
const assert = require('assert');
const request = require('superagent');
const crypto = require('crypto');
const querystring = require('querystring');
const { get } = require('lodash');

require('superagent-proxy')(request);

const baseUrl = 'https://api.coinex.com/v1';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36';

const maybeAddProxy = _ => (process.env.HTTP_PROXY ? _.proxy(process.env.HTTP_PROXY) : _);

const ok = _ => {
  if (!_.ok) {
    return false;
  }

  let body;

  try {
    body = JSON.parse(_.text);
  } catch (error) {
    return false;
  }

  return body && body.code === 0;
};

const wrapResponseError = error => {
  if (!error.response) {
    throw error;
  }

  const status = error.status || '<none>';

  let body;

  try {
    body = JSON.parse(error.response.text);
  } catch (error) {}

  if (!body) {
    const text = error.response.text || '<none>';

    const wrapped = Object.assign(new Error(`Coinex error. Status=${status}; Text=${text}`), {
      inner: error,
      response: error.response,
      status,
    });

    throw wrapped;
  }

  const { code = '<none>', message = '<none>' } = body;

  const wrapped = Object.assign(new Error(`Coinex error. Code=${code}; Status=${status} Message=${message}`), {
    response: error.response,
    status,
    coinex: body,
  });

  throw wrapped;
};

const createCoinexClient = (apiKey, apiSecret) => {
  const coinexGet = async (path, fields = {}) => {
    assert(path, 'path is required');

    const tonce = Date.now().toString();
    const completeUrl = baseUrl + path;

    const body = {
      access_id: apiKey,
      tonce,
      ...fields,
    };

    const bodySorted = Object.keys(body)
      .slice()
      .sort()
      .reduce(
        (prev, key) => ({
          ...prev,
          [key]: body[key],
        }),
        {}
      );

    const bodyAsQueryString = querystring.stringify(bodySorted);

    const bodyAsQueryStringWithSecret = bodyAsQueryString + '&secret_key=' + apiSecret;

    const signature = crypto
      .createHash('md5')
      .update(bodyAsQueryStringWithSecret)
      .digest('hex')
      .toUpperCase();

    const separator = completeUrl.includes('?') ? '&' : '?';

    return maybeAddProxy(
      request
        .get(completeUrl + separator + bodyAsQueryString)
        .set('authorization', signature)
        .set('User-Agent', USER_AGENT)
        .accept('application/json')
        .ok(ok)
    ).then(_ => JSON.parse(_.text).data, wrapResponseError);
  };

  const coinexPost = async (path, fields = {}, method = 'POST') => {
    assert(path, 'path is required');

    const tonce = Date.now().toString();
    const completeUrl = baseUrl + path;

    const body = {
      access_id: apiKey,
      tonce,
      ...fields,
    };

    const bodySorted = Object.keys(body)
      .slice()
      .sort()
      .reduce(
        (prev, key) => ({
          ...prev,
          [key]: body[key],
        }),
        {}
      );

    const bodyAsQueryString = querystring.stringify(bodySorted);

    const bodyAsQueryStringWithSecret = bodyAsQueryString + '&secret_key=' + apiSecret;

    const signature = crypto
      .createHash('md5')
      .update(bodyAsQueryStringWithSecret)
      .digest('hex')
      .toUpperCase();

    const methodLowerCase = method.toLowerCase();

    return maybeAddProxy(
      request[methodLowerCase](completeUrl)
        .send(bodySorted)
        .set('authorization', signature)
        .set('User-Agent', USER_AGENT)
        .accept('application/json')
        .ok(ok)
    ).then(_ => JSON.parse(_.text).data, wrapResponseError);
  };

  return { get: coinexGet, post: coinexPost };
};

module.exports = createCoinexClient;
