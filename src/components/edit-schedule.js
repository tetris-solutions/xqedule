const yo = require('yo-yo')
const moment = require('moment')

function editSchedule ({params: {scheduleId}, store, state}) {
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

  const {schedule} = store

  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} was not found`)
  }

  return yo`
    <div>
        <header>
            <h1>
                ${schedule.task} <small>${moment(schedule.timestamp).fromNow()}</small>
            </h1>
        </header>
        <main>
            <del>This is already a bit problematic for me</del>
            <br>
            <a href='/'>Go back to list</a>
        </main>
    </div>`
}

editSchedule.onEnter = require('../actions/load-one-schedule')

module.exports = editSchedule
