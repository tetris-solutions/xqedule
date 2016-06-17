'use strict'
const env = process.env.NODE_ENV || 'development'
const configs = require('../knexfile')

module.exports = require('knex')(configs[env])
