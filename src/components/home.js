const yo = require('yo-yo')
const loadTasks = require('../actions/load-tasks')
const loadSchedules = require('../actions/load-schedules')
const map = require('lodash/map')
const scheduleTime = require('./schedule-time')
const moment = require('moment')
const deleteTask = require('../actions/delete-task')
const filter = require('lodash/filter')
const assign = require('lodash/assign')
const command = require('../compiled-command')

function taskDisplay (task, onClickDelete) {
  function taskRow (schedule) {
    return yo`
    <tr>
        <td><a href='/schedule/${schedule.id}'>${scheduleTime(schedule)}</a></td>
        <td>${command(task, schedule)}</td>
        <td>${moment(schedule.creation).fromNow()}</td>
        <td>${schedule.disabled ? yo`<strong style="color: red">OFF</strong>` : yo`<strong style="color: green">ON</strong>`}</td>
    </tr>`
  }

  return yo`
  <details>
    <summary>
        Task "${task.name}" - ${task.schedules.length} schedules
    </summary>
    <section>
        <pre>$ ${task.command}</pre>
        <table border="1">
            <thead>
                <tr>
                    <th>Schedule</th>
                    <th>Command</th>
                    <th>Creation</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${map(task.schedules, taskRow)}
            </tbody>
        </table>
        <br>
        <button onclick=${onClickDelete.bind(null, task.id)}>Remove Task</button>
        <a href='/task/${task.id}'>Edit task</a>
        <a href='/create/schedule/${task.id}'>Add schedule</a>
        <br>
        <br>
    </section>
  </details>
  `
}

function home (context) {
  function onClickDelete (id) {
    deleteTask(id)
      .then(() => home.onEnter(context))
      .then(() => context.save())
  }

  return yo`
  <div>
    <header>
        <h1>Schedule Summary</h1>
    </header>
    <main>
        ${map(context.state.scheduleTree, task => taskDisplay(task, onClickDelete))}
        <br>
        <a href='/create/task'>Create Task</a>
    </main>
  </div>
  `
}

home.onEnter = context =>
  Promise.all([
    loadTasks(context),
    loadSchedules(context)
  ]).then(() => {
    context.state.scheduleTree = map(context.store.tasks,
      task => assign({
        schedules: filter(context.store.schedules, {task: task.id})
      }, task)
    )
  })

module.exports = home
