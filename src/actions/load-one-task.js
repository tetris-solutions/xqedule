const http = require('../http')

const loadOneTask = ({params: {taskId}, store}) =>
  http.GET(`/api/task/${taskId}`)
    .then(response => {
      store.task = response.data
      return response
    })

module.exports = loadOneTask
