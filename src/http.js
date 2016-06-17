'use strict'
const assign = require('lodash/assign')
const xhr = require('xhr')

function apiFetch (uri, config) {
  const reqConfig = assign({uri}, config)

  reqConfig.headers = assign(reqConfig.headers || {}, {
    Accept: 'application/json'
  })

  if (reqConfig.body) {
    reqConfig.body = JSON.stringify(reqConfig.body)

    assign(reqConfig.headers, {
      'Content-Type': 'application/json'
    })
  }

  return new Promise((resolve, reject) =>
    xhr(reqConfig, (err, response, body) => {
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch (e) {

        }
      }

      if (err) {
        response.data = body && body.message ? body : err
        reject(response)
      } else {
        response.data = body
        resolve(response)
      }
    }))
}

function useMethod (method) {
  return function (endpoint, config) {
    return apiFetch(endpoint, assign({method}, config))
  }
}

exports.GET = apiFetch
exports.POST = useMethod('POST')
exports.PUT = useMethod('PUT')
exports.DELETE = useMethod('DELETE')
