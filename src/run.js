const moment = require('moment')
const path = require('path')
const db = require('./db')
const logger = require('./logger')
const usage = require('pidusage')
const spawn = require('child_process').spawn
const fs = require('fs')
const mustache = require('mustache')
const assign = require('lodash/assign')
const pick = require('lodash/pick')
const round = require('lodash/round')

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

  process.cpu_usage = []
  process.memory_usage = []

  let lock
  let interval

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
        logger.notice(`could not read stats for instance of schedule ${process.schedule}`, {
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
    delete running[process.schedule]
    usage.unmonitor(childProcess.pid)

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
    persistStat()
    onExit()
  }

  childProcess.on('exit', onExit)
}

function run (schedule) {
  if (running[schedule.id]) {
    logger.info(`schedule ${schedule.id} (${schedule.task.name}) is already running with pid ${running[schedule.id].childProcess.pid}`)
    return
  }

  return Promise.resolve()
    .then(() => {
      const command = mustache.render(schedule.task.command, schedule.params)

      const parts = command.split(' ')
      const id = moment.utc().format('YYYYMMDDHHmmssSSSS')
      const logFileName = `${id}-${schedule.task.id}-${schedule.id}.log`
      const logPath = path.resolve(rootPath, 'logs', logFileName)
      const logWriteStream = fs.createWriteStream(logPath)

      /**  @type {ChildProcess} */
      const childProcess = spawn(parts[0], parts.slice(1), {
        cwd: rootPath,
        stdio: [null, 'pipe', 'pipe']
      })

      const instance = running[schedule.id] = {childProcess}

      childProcess.stdout.pipe(logWriteStream)
      childProcess.stderr.pipe(logWriteStream)

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

      return db('process').insert(process)
        .then(() => monitor(childProcess, process))
    })
    .catch(err => {
      logger.crit(`Failed to run schedule for ${schedule.task.name}`, {
        error: serializeError(err)
      })
    })
}

module.exports = run
