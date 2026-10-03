/**
 * Netlify Serverless Function Proxy
 * Handles CORS, request forwarding, redirects, and error handling
 */

exports.handler = async function (event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL || '';
    if (!appsScriptUrl) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: false,
          error: {
            code: 'CONFIG',
            message: 'APPS_SCRIPT_URL environment variable is not configured on Netlify.'
          }
        })
      };
    }

    const payload = event.body;

    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: payload,
      redirect: 'follow'
    });

    const responseData = await response.text();

    return {
      statusCode: 200,
      headers,
      body: responseData
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'SERVER',
          message: 'Netlify Proxy Gateway Error: ' + error.message
        }
      })
    };
  }
};
