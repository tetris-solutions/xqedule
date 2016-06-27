const moment = require('moment')

const scheduleTime = ({
  timestamp,
  interval,
  day_of_week,
  day_of_month,
  month,
  hour,
  minute
}) => {
  if (interval) {
    return interval < 60
      ? `interval of ${interval} seconds`
      : `interval of ${moment.duration(interval, 'seconds').humanize()}`
  }

  if (timestamp) {
    return moment(timestamp).fromNow()
  }

  const parts = []
  const d = moment()

  if (day_of_week !== null) {
    parts.push('on ' + d.day(day_of_week).format('dddd') + 's')
  }

  if (day_of_month !== null) {
    parts.push('every ' + d.date(day_of_month).format('Do'))
  }

  if (month !== null) {
    parts.push('in ' + d.month(month - 1).format('MMMM'))
  }

  if (hour !== null) {
    parts.push('at ' + d.hour(hour).format('HH') + 'h')
  }

  if (minute !== null) {
    parts.push('at minute ' + d.minute(minute).format('mm'))
  }

  return parts.join(', ')
}

module.exports = scheduleTime
