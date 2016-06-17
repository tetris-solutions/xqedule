const http = require('../http')

const loadOneTask = ({params, store}) =>
  http.GET(`/api/task/${params.taskId}`)
    .then(response => {
      store.task = response.data
      return response
    })

module.exports = loadOneTask
