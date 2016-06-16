const emitter = require('./emitter')
const db = require('./db')
const logger = require('./logger')
const run = require('./run')
const moment = require('moment-timezone')
const filter = require('lodash/filter')
const map = require('lodash/fp/map')
const omit = require('lodash/omit')
const assign = require('lodash/assign')
const curry = require('lodash/curry')
const compose = require('lodash/fp/compose')
const pick = require('lodash/pick')

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
    newSchedules[schedule.timezone] = schedule
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
  const hydrate = ls => Promise.all(map(parse, ls))

  return db.select(
    'schedule.*',
    'task.command AS task_command',
    'task.id AS task_id',
    'task.params AS task_params',
    'task.name AS task_name')
    .from('schedule')
    .join('task', 'task.id', 'schedule.task')
    .then(hydrate)
    .then(map(organize(newSchedules)))
    .then(schedules => {
      logger.info(`found ${schedules.length} schedules`)
    })
    .then(() => assign(schedules, newSchedules))
    .catch(err => {
      logger.crit('Failed to update schedules', assign({}, err, pick(err, 'message', 'stack', 'code')))
    })
}

function intervalHasExpired (schedule) {
  return moment().diff(moment(schedule.lastExecution), 'seconds') >= schedule.interval
}

function tick () {
  global.gc()

  filter(schedules.interval, intervalHasExpired)
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
