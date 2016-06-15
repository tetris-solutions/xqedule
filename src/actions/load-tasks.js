const http = require('../http')

const loadTasks = ({store}) =>
  http.GET('/api/tasks')
    .then(response => {
      store.tasks = response.data
      return response
    })

module.exports = loadTasks

