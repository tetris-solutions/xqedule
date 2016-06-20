'use strict'
const moment = require('moment')
const path = require('path')
const db = require('./db')
const logger = require('./logger')
const usage = require('pidusage')
const spawn = require('child_process').spawn
const fs = require('fs')
const assign = require('lodash/assign')
const pick = require('lodash/pick')
const round = require('lodash/round')
const compiledCommand = require('./compiled-command')

const running = {}

const REFRESH_STAT_INTERVAL = 1000 * 5
const rootPath = path.resolve(__dirname, '..')
const serializeError = err => assign({}, err, pick(err, 'message', 'stack', 'code'))

/**
 * monitor process stats
 * @param {ChildProcess} childProcess the actual child_process
 * @param {Object} process the process descriptor object
 * @returns {undefined}
 */
function monitor (childProcess, process) {
  const {pid} = childProcess
  let hasExited = false
  let lock
  let interval

  process.cpu_usage = []
  process.memory_usage = []

  const persistStat = () => db('process')
    .where('id', process.id)
    .update({
      cpu_usage: JSON.stringify(process.cpu_usage),
      memory_usage: JSON.stringify(process.memory_usage)
    }).then()

  function getStat () {
    if (lock) return

    lock = true

    usage.stat(pid, (err, stat) => {
      lock = false

      if (err) {
        logger.notice(`could not read stats for ${process.schedule.task.name}`, {
          pid,
          process,
          error: serializeError(err)
        })
        return
      }

      process.cpu_usage.push(round(stat.cpu, 2))
      process.memory_usage.push(round(stat.memory, 2))

      persistStat()
    })

    global.gc()
  }

  function onExit (code = null) {
    if (hasExited) return

    hasExited = true

    delete running[process.schedule.id]
    usage.unmonitor(childProcess.pid)

    process.logWriteStream.end()

    clearInterval(interval)

    process.exit_code = code
    process.end = new Date().toISOString()

    return db('process').where('id', process.id).update({
      exit_code: process.exit_code,
      end: process.end
    }).then()
  }

  if (childProcess.connected) {
    interval = setInterval(getStat, REFRESH_STAT_INTERVAL)
    getStat()
  } else {
    setTimeout(() => {
      persistStat()
      onExit()
    }, 100)
  }

  function handleError (err) {
    setTimeout(() => {
      logger.error(`${process.schedule.task.name} with pid of ${pid} has failed`,
        serializeError(err))

      onExit(isNaN(Number(err.code)) ? null : Number(err.code))
    }, 100)
  }

  childProcess.on('error', handleError)
  childProcess.on('exit', onExit)
}

function run (schedule) {
  if (running[schedule.id]) {
    logger.info(`schedule ${schedule.id} (${schedule.task.name}) is already running with pid ${running[schedule.id].childProcess.pid}`)
    return
  }

  return Promise.resolve()
    .then(() => {
      const command = compiledCommand(schedule.task, schedule)

      const parts = command.split(' ')
      const id = moment.utc().format('YYYYMMDDHHmmssSSSS')
      const logFileName = `${id}-${schedule.task.id}-${schedule.id}.log`
      const logPath = path.resolve(rootPath, 'logs', logFileName)
      const logWriteStream = fs.createWriteStream(logPath)

      /**  @type {ChildProcess} */
      const childProcess = spawn(parts[0], parts.slice(1), {
        cwd: rootPath,
        stdio: ['ipc', 'pipe', 'pipe']
      })

      const instance = running[schedule.id] = {childProcess}

      childProcess.stdout.pipe(logWriteStream, {end: false})
      childProcess.stderr.pipe(logWriteStream, {end: false})

      logger.debug(`Started ${schedule.task.name} with pid ${childProcess.pid}`, {
        last_execution: moment(schedule.lastExecution).fromNow(),
        schedule_id: schedule.id,
        process_id: id,
        pid: childProcess.pid,
        task_id: schedule.task.id,
        task_name: schedule.task.name,
        command
      })

      const process = {
        id,
        command,
        pid: childProcess.pid,
        schedule: schedule.id,
        log_file: logPath,
        creation: new Date().toISOString()
      }

      instance.process = process
      schedule.lastExecution = process.creation

      monitor(childProcess, assign({}, process, {schedule, logWriteStream}))

      return db('process').insert(process).then()
    })
    .catch(err => {
      logger.crit(`Failed to run schedule for ${schedule.task.name}`, {
        error: serializeError(err)
      })
    })
}

module.exports = run
