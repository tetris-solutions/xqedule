'use strict'
const fs = require('fs')
const restify = require('restify')
const Tail = require('tail').Tail

const safeParseJSON = str => {
  if (!str) return null

  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

function tailLogFile (req, res, next) {
  const {db} = req
  let messageCount = 0

  function send (data) {
    messageCount++
    res.write('id:' + messageCount + '\n')
    res.write(`data:${JSON.stringify(data)}\n\n`)
  }

  function sendLogLine (log) {
    send({log})
  }

  function readProcess () {
    return db.first('*')
      .from('process')
      .where('id', req.params.processId)
      .then(p => {
        if (p) {
          p.cpu_usage = safeParseJSON(p.cpu_usage) || []
          p.memory_usage = safeParseJSON(p.memory_usage) || []
        }
        return p
      })
  }

  let timeout

  function sendFreshProcess (process) {
    send(process)

    if (!process.end) {
      clearTimeout(timeout)
      timeout = setTimeout(pollForProcessUpdates, 5 * 1000)
    }
  }

  function pollForProcessUpdates () {
    readProcess()
      .then(sendFreshProcess)
  }

  function onProcessLoaded (process) {
    const filePath = process.log_file

    sendFreshProcess(process)

    try {
      fs.statSync(filePath)
    } catch (e) {
      return next(new restify.NotFoundError('Log file not found'))
    }

    function onLogReady (err, contentString) {
      if (err) {
        return new restify.InternalServerError(err.message || 'Error reading log')
      }

      sendLogLine(contentString)

      const tail = new Tail(filePath)
      let watching = true

      function unwatch () {
        if (watching) {
          pollForProcessUpdates()
          watching = false
          tail.unwatch()
        }
      }

      tail.on('line', sendLogLine)

      req.on('end', unwatch)
      req.on('close', unwatch)
    }

    fs.readFile(filePath, 'utf8', onLogReady)
  }

  res.removeHeader('Content-Encoding')
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Connection', 'keep-alive')
  res.writeHead(200)
  res.write('\n\n')

  return readProcess()
    .then(process => {
      if (!process) {
        return next(new restify.NotFoundError('Log file not found'))
      }

      onProcessLoaded(process)
    })
    .catch(err => next(new restify.InternalServerError(err.message)))
}

module.exports = server => server.get('/api/process/:processId/watch', tailLogFile)
