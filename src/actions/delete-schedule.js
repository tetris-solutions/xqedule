const http = require('../http')

const deleteSchedule = id => http.DELETE('/api/schedule/' + id)

module.exports = deleteSchedule
