const assign = require('lodash/assign')

function toJSON (response) {
  if (response.status === 204) return response

  function invalidResponse () {
    response.data = {
      message: 'Oopss... The API returned an invalid response'
    }
    response.data.stack = new Error().stack
    return Promise.reject(response)
  }

  if (typeof response.json !== 'function') {
    return invalidResponse()
  }

  return response.json()
    .then(function (data) {
      response.data = data
      return response
    })
    .catch(invalidResponse)
}

function checkStatus (response) {
  return response.ok ? response : Promise.reject(response)
}

const sendsJson = {
  'Content-Type': 'application/json'
}

function apiFetch (endpoint, config) {
  const reqConfig = assign({}, config)

  reqConfig.headers = assign(reqConfig.headers || {}, {
    credentials: 'same-origin',
    Accept: 'application/json'
  })

  if (reqConfig.body) {
    reqConfig.body = JSON.stringify(reqConfig.body)
    assign(reqConfig.headers, sendsJson)
  }

  return fetch(endpoint, reqConfig)
    .then(toJSON)
    .then(checkStatus)
}

function useMethod (method) {
  return function (endpoint, config) {
    return apiFetch(endpoint, assign({method: method}, config))
  }
}

exports.GET = apiFetch
exports.POST = useMethod('POST')
exports.PUT = useMethod('PUT')
exports.DELETE = useMethod('DELETE')
