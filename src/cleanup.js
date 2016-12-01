const moment = require('moment')
const fs = require('fs')
const db = require('./db')
const emitter = require('./emitter')
const logger = require('./logger')
const assign = require('lodash/assign')
const sortBy = require('lodash/sortBy')
const scheduleTime = require('./components/schedule-time')
const sum = require('lodash/sum')
const prettyBytes = require('pretty-bytes')

const pColumns = ['id', 'schedule', 'creation', 'exit_code', 'log_file', 'pid']
const sCols = [
  'schedule.id',
  'schedule.task',
  'schedule.timestamp',
  'schedule.interval',
  'schedule.day_of_week',
  'schedule.day_of_month',
  'schedule.month',
  'schedule.hour',
  'schedule.minute']
const sequential = (ls, fn) => {
  let promise = Promise.resolve()
  const results = []

  ls.forEach(item => {
    promise = promise.then(r => {
      results.push(r)

      return fn(item)
    })
  })

  return promise
    .then(() => {
      return results.slice(1)
    })
}

function removeLogFile (filePath) {
  return new Promise((resolve, reject) => fs.stat(filePath, (statErr, stats) => {
    if (statErr) {
      resolve(0) // file does not exist or something
    } else {
      resolve(stats.size)
      // fs.unlink(filePath, rmErr => {
      //   if (rmErr) {
      //     reject(rmErr)
      //   } else {
      //     resolve(stats.size)
      //   }
      // })
    }
  }))
}

function removeProcess (proc) {
  const {id, log_file} = proc

  return removeLogFile(log_file)
    .then(bitesSaved => {
      // db('process').where('id', id).del()

      return bitesSaved
    })
    .catch(err => {
      logger.warn(`Could not remove process #${id}`, assign({err}, proc))
    })
}

function removeManyProcs (procs) {
  logger.info(`Starting to collect ${procs.length} processes`)

  return sequential(procs, removeProcess)
    .then(bytes => {
      logger.info(`Done, saving ${prettyBytes(sum(bytes))}`)
    })
}

function removeSchedule (schedule) {
  const {id, task, last_run} = schedule

  logger.info('Garbage collect schedule', `#${id}`, `@${task}`,
    scheduleTime(schedule),
    last_run ? `(last run ${moment(last_run).fromNow()})` : undefined)

  return db.select(...pColumns)
    .from('process')
    .where('process.schedule', id)
    .then(removeManyProcs)
    .then(() => {
      // return db('schedule').where('id', id).del()
    })
}

function cleanScheduleProcs (schedule) {
  const {id, task} = schedule

  logger.info('Garbage collect schedule', `#${id}`, `@${task}`, scheduleTime(schedule))

  return db.select(...pColumns)
    .from('process')
    .where('process.schedule', id)
    .then(procs => {
      const stale = sortBy(procs, 'creation').slice(15)

      return removeManyProcs(stale)
    })
}

function cleanup () {
  const getStaleOneOffSchedules = () =>
    db.select(...sCols.concat(['process.creation AS last_run']))
      .from('schedule')
      .join('process', 'process.schedule', 'schedule.id')
      .whereNotNull('schedule.timestamp')
      .where('schedule.timestamp', '<', db.fn.now())
      .where('process.creation', '<', moment().subtract(7, 'days').toISOString())

  const getRegularSchedules = () =>
    db.select(...sCols)
      .from('schedule')
      .whereNull('schedule.timestamp')

  const run = fn => ls => sequential(ls, fn)

  return getStaleOneOffSchedules()
    .then(run(removeSchedule))
    .then(getRegularSchedules)
    .then(run(cleanScheduleProcs))
    .then(r => {
      emitter.emit('cleanup')

      return r
    })
}

exports.cleanup = cleanup
