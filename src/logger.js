'use strict'
const winston = require('winston')

const transports = [
  new winston.transports.Console({
    level: 'debug',
    json: false,
    colorize: true
  })
]

module.exports = new winston.Logger({
  transports,
  levels: winston.config.syslog.levels,
  exitOnError: false
})
