const http = require('../http')

const loadOneSchedule = ({params: {scheduleId}, store}) =>
  http.GET(`/api/schedule/${scheduleId}`)
    .then(response => {
      store.schedule = response.data
      return response
    })

module.exports = loadOneSchedule
