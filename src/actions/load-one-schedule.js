const http = require('../http')

const loadOneSchedule = ({params, store}) =>
  http.GET(`/api/schedule/${params.scheduleId}`)
    .then(response => {
      store.schedule = response.data
      return response
    })

module.exports = loadOneSchedule
