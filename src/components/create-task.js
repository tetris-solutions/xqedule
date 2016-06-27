const taskForm = require('./task-form')
const yo = require('yo-yo')

function createTask (context) {
  return yo`
    <div>
        <header>
            <h1>Create Task</h1>
        </header>
        <hr>
        ${taskForm(context)}
    </div>`
}

module.exports = createTask
