#!/usr/bin/env node

require('dotenv').config({
  path: require('path').resolve(__dirname, '..', '.env')
})

const developmentMode = process.env.NODE_ENV === 'development'
const spawn = require('child_process').spawn
const resolve = require('path').resolve
const daemonScript = resolve(
  __dirname,
  '..',
  developmentMode ? 'src' : 'lib',
  'daemon.js'
)

spawn('node', ['--expose-gc', daemonScript], {
  cwd: resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
})
