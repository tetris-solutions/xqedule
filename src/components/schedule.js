const yo = require('yo-yo')
const moment = require('moment')
const page = require('page')
const deleteSchedule = require('../actions/delete-schedule')
const mean = require('lodash/mean')
const bytes = require('pretty-bytes')
const scheduleTime = require('./schedule-time')
const command = require('../compiled-command')

function processRow ({pid, creation, end, log_file, memory_usage, cpu_usage, command}) {
  return yo`
    <tr>
      <td>${moment(creation).fromNow()}</td>
      <td>${pid}</td>
      <td>${end ? moment(end).fromNow() : '---'}</td>
      <td>${command}</td>
      <td>${cpu_usage.length ? mean(cpu_usage).toFixed(2) + '%' : '--'}</td>
      <td>${memory_usage.length ? bytes(mean(memory_usage)) : '--'}</td>
      <td>${log_file}</td>
    </tr>`
}

function processTable (processes) {
  return yo`
  <table border='1' style='border: 1px solid gray; border-collapse: separate;'>
    <thead>
        <tr>
          <th>Started</th>
          <th>PID</th>
          <th>End</th>
          <th>Command</th>
          <th>CPU Usage</th>
          <th>Memory Usage</th>
          <th>Log file</th>
        </tr>
    </thead>
    <tbody>
       ${processes.map(processRow)}    
    </tbody>
  </table>
  `
}

function viewSchedule ({params, store, state}) {
  const {scheduleId} = params
  const {schedule} = store

  if (state.isLoading) {
    return yo`
      <div>
        <header>
            <h1>Schedule ${scheduleId}</h1>
        </header>
        <main>
            <p>Loading...</p>        
        </main>
      </div>
    `
  }

  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} was not found`)
  }

  function onRemoveClick () {
    deleteSchedule(scheduleId)
      .then(() => page('/'))
  }

  return yo`
    <div>
        <header>
            <h1>
                "${schedule.task.name}" <small>${scheduleTime(schedule)}</small>
            </h1>
        </header>
        <main>
            <pre>$ ${command(schedule.task, schedule)}</pre>
            ${processTable(schedule.processes)}
            <br>
            <a href='/'>cancel</a> <button onclick=${onRemoveClick}>remove</button>
        </main>
    </div>`
}

viewSchedule.onEnter = require('../actions/load-one-schedule')

module.exports = viewSchedule
