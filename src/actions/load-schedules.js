const http = require('../http')

const loadSchedules = ({store}) =>
  http.GET('/api/schedules')
    .then(response => {
      store.schedules = response.data
      return response
    })

module.exports = loadSchedules
