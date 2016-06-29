const http = require('../http')

const loadOneTask = ({params, store}) =>
  http.GET(`/api/process/${params.processId}`)
    .then(response => {
      store.process = response.data
      return response
    })

module.exports = loadOneTask
