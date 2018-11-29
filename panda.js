// From https://documentation.panda.exchange/#generalidades
const assert = require('assert');
const superagent = require('superagent');
const { get } = require('lodash');
const debug = require('debug')('cryptopost:panda');

require('superagent-proxy')(superagent);

const baseUrl = 'https://api.panda.exchange';

const maybeAddProxy = _ => (process.env.HTTP_PROXY ? _.proxy(process.env.HTTP_PROXY) : _);

const ok = res => {
  if (!res.ok) {
    return false;
  }

  // TODO: Make sure 204, 201, etc. Or just check Content-Length.
  if (!res.text) {
    return true;
  }

  let body;

  try {
    body = JSON.parse(res.text);
  } catch (error) {
    return false;
  }

  return body && !body.status_code && !body.errors;
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

    const wrapped = Object.assign(new Error(`Panda error. Status=${status}; Text=${text}`), {
      inner: error,
      response: error.response,
      status,
    });

    throw wrapped;
  }

  const { code = '<none>', message = '<none>' } = get(body, 'errors.0');

  const wrapped = Object.assign(new Error(`Panda error. Code=${code}; Status=${status} Message=${message}`), {
    response: error.response,
    status,
    panda: body,
  });

  throw wrapped;
};

const createPandaClient = token => {
  assert(token, 'token is required');

  const request = async (path, fields = {}, method = 'GET') => {
    assert(path, 'path is required');

    const completeUrl = baseUrl + path;
    const methodLowerCase = method.toLowerCase();

    assert(superagent[methodLowerCase], `${methodLowerCase} not known`);

    debug(`--> ${method} ${completeUrl}: ${JSON.stringify(fields, null, 2)}`);

    let requestChain = superagent[methodLowerCase](completeUrl)
      .set('Authorization', `Token ${token}`)
      .accept('application/json')
      .ok(ok);

    // TODO: OPTIONS?
    if (fields && method !== 'GET') {
      requestChain = requestChain.send(fields);
    }

    const result = await maybeAddProxy(requestChain).then(_ => _.body, wrapResponseError);

    debug(`<-- ${method} ${completeUrl}: ${JSON.stringify(result, null, 2)}`);

    return result;
  };

  return { request };
};

module.exports = createPandaClient;
