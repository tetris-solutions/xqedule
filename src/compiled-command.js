'use strict'
const isObject = require('lodash/isObject')
const mustache = require('mustache')
const he = require('he')

module.exports = (task, schedule) => isObject(schedule.params)
  ? he.decode(mustache.render(task.command, schedule.params))
  : task.command
