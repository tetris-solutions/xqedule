const yo = require('yo-yo')
const scheduleForm = require('./schedule-form')

function createSchedule (context) {
  return yo`
    <div>
      <header>
        <h1>Create schedule</h1>
      </header>
      <main>
        ${scheduleForm(context)}
      </main>
    </div>`
}

createSchedule.onEnter = require('../actions/load-one-task')

module.exports = createSchedule
