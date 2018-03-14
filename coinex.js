// From https://github.com/coinexcom/coinex_exchange_api/wiki/012security_authorization
const request = require('superagent');
const crypto = require('crypto');
const querystring = require('querystring');

const baseUrl = 'https://api.coinex.com/v1';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36';

const createCoinexClient = (apiKey, apiSecret) => {
  const get = async (url, fields = {}) => {
    const tonce = Date.now().toString();
    const completeUrl = baseUrl + url;

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

    const bodyAsQueryStringWithSecret =
      bodyAsQueryString + '&secret_key=' + apiSecret;

    const signature = crypto
      .createHash('md5')
      .update(bodyAsQueryStringWithSecret)
      .digest('hex')
      .toUpperCase();

    const requestPromise = request
      .get(completeUrl + '?' + bodyAsQueryString)
      .set('authorization', signature)
      .set('User-Agent', USER_AGENT);

    try {
      const response = await requestPromise;
      const { body } = response;
      const { code, message } = body;

      if (code) {
        throw new Error(`Coinex error #${code}: ${message}`);
      }

      return body.data;
    } catch (error) {
      if (error.response) {
        console.error('Coinex request failed:');
        console.error(error.response.body);
      }
      throw error;
    }
  };

  return { get };
};

module.exports = createCoinexClient;
