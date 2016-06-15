#!/usr/bin/env node

require('dotenv').config({
  path: require('path').resolve(__dirname, '..', '.env')
})

const developmentMode = process.env.NODE_ENV === 'development'
const spawn = require('child_process').spawn
const resolve = require('path').resolve
const serverScript = resolve(
  __dirname,
  '..',
  developmentMode ? 'src' : 'lib',
  'server.js'
)

spawn('node', [serverScript, '--expose-gc'], {
  cwd: resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
})

if (developmentMode) {
  spawn('npm', ['run', 'watch'], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit'
  })
}
