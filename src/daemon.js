const emitter = require('./emitter')
const db = require('./db')
const logger = require('./logger')
const run = require('./run')
const moment = require('moment-timezone')
const filter = require('lodash/filter')
const mapFp = require('lodash/fp/map')
const omit = require('lodash/omit')
const assign = require('lodash/assign')
const curry = require('lodash/curry')
const compose = require('lodash/fp/compose')
const pick = require('lodash/pick')
const flatten = require('lodash/flatten')
const map = require('lodash/map')

const schedules = {
  dynamic: {
    'America/Sao_Paulo': []
  },
  interval: [],
  timestamp: []
}
const t0 = new Date(0).toISOString()

function getLastExecution (scheduleId) {
  return db.first('creation')
    .from('process')
    .where('schedule', scheduleId)
    .whereNotNull('end')
    .orderBy('creation', 'desc')
    .limit(1)
    .then(t => t ? t.creation : t0)
}

function parseParams (params) {
  if (!params) return null

  try {
    return JSON.parse(params)
  } catch (e) {
    return null
  }
}

const parseSchedule = schedule => assign(
  {
    params: parseParams(schedule.params),
    task: {
      command: schedule.task_command,
      id: schedule.task_id,
      name: schedule.task_name,
      params: parseParams(schedule.task_params)
    }
  },
  omit(schedule,
    'task',
    'params',
    'task_id',
    'task_command',
    'task_params',
    'task_name')
)

const saveLastExecution = schedule =>
  getLastExecution(schedule.id)
    .then(lastExecution =>
      assign({lastExecution}, schedule))

const organize = curry((newSchedules, schedule) => {
  if (schedule.interval) {
    newSchedules.interval.push(schedule)
  } else if (schedule.timestamp) {
    newSchedules.timestamp.push(schedule)
  } else if (schedule.timezone) {
    newSchedules.dynamic[schedule.timezone] = newSchedules.dynamic[schedule.timezone] || []
    newSchedules.dynamic[schedule.timezone].push(schedule)
  }

  return schedule
})

function preventRace (fn) {
  let reloadTimeout
  let lock

  function unlock () {
    lock = false
  }

  function executeIfNotAlreadyRunning () {
    clearTimeout(reloadTimeout)

    if (lock) {
      reloadTimeout = setTimeout(executeIfNotAlreadyRunning, 300)
      return
    }

    lock = true

    fn().then(unlock, unlock)
  }

  return executeIfNotAlreadyRunning
}

function searchSchedules () {
  logger.info('will update list of schedules')

  const newSchedules = {
    dynamic: {},
    interval: [],
    timestamp: []
  }

  const parse = compose(saveLastExecution, parseSchedule)
  const hydrate = ls => Promise.all(mapFp(parse, ls))

  return db.select(
    'schedule.*',
    'task.command AS task_command',
    'task.id AS task_id',
    'task.params AS task_params',
    'task.name AS task_name')
    .from('schedule')
    .join('task', 'task.id', 'schedule.task')
    .then(hydrate)
    .then(mapFp(organize(newSchedules)))
    .then(schedules => {
      logger.info(`found ${schedules.length} schedules`)
    })
    .then(() => assign(schedules, newSchedules))
    .catch(err => {
      logger.crit('Failed to update schedules', assign({}, err, pick(err, 'message', 'stack', 'code')))
    })
}

function intervalHasExpired (schedule) {
  const lastMoment = moment(schedule.lastExecution)
  const elapsed = moment().diff(lastMoment, 'seconds')
  const timeIsUp = elapsed >= schedule.interval

  if (process.env.NODE_ENV === 'development' && !timeIsUp) {
    logger.debug(`${schedule.task.name}: too soon; ${schedule.interval - elapsed} seconds to go`)
  }

  return timeIsUp
}

function hasReachedTimestamp (schedule) {
  return schedule.lastExecution === t0 && Date.now() >= new Date(schedule.timestamp).getTime()
}

function getMatchingSchedules (schedules, timezone) {
  const now = moment.tz(timezone)

  const matchesCurrentTime = ({
    day_of_week,
    day_of_month,
    month,
    hour,
    minute
  }) => (
    (day_of_week === null || now.day() + 1 === day_of_week) &&
    (day_of_month === null || now.date() === day_of_month) &&
    (month === null || now.month() + 1 === month) &&
    (hour === null || now.hour() === hour) &&
    (minute === null || now.minute() === minute)
  )

  const minuteFmt = 'YYYY-MM-DD HH:mm'

  const didNotRunYet = ({lastExecution}) => moment(lastExecution)
    .tz(timezone)
    .format(minuteFmt) !== now.format(minuteFmt)

  return filter(schedules, schedule => matchesCurrentTime(schedule) && didNotRunYet(schedule))
}

function tick () {
  global.gc()

  filter(schedules.interval, intervalHasExpired)
    .forEach(run)

  filter(schedules.timestamp, hasReachedTimestamp)
    .forEach(run)

  flatten(map(schedules.dynamic, getMatchingSchedules))
    .forEach(run)
}

const updateSchedules = preventRace(searchSchedules)

updateSchedules()

const tickInterval = setInterval(tick, 1000 * 5)

emitter.on('schedule::insert', updateSchedules)
emitter.on('schedule::delete', updateSchedules)
emitter.on('placeholder::event', () => {
  clearInterval(tickInterval)
})

require('./server')
