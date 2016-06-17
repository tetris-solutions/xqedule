const http = require('../http')

const deleteTask = id => http.DELETE('/api/task/' + id)

module.exports = deleteTask
