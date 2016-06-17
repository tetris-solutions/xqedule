'use strict'
const isObject = require('lodash/isObject')
const mustache = require('mustache')

module.exports = (task, schedule) => isObject(schedule.params)
  ? mustache.render(task.command, schedule.params)
  : task.command
