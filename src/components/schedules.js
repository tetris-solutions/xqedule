const yo = require('yo-yo')
const loading = require('./loading')
const scheduleTime = require('./schedule-time')

function scheduleLink (schedule) {
  return yo`
    <li>
      <a href='/schedule/${schedule.id}'>${schedule.task}: ${scheduleTime(schedule)}</a>
    </li>`
}

function scheduleList (schedules) {
  return yo`
    <main>
      <a href='/create'>create new</a>
      <hr>
      <ul>
          ${schedules.map(scheduleLink)}
      </ul>
    </main>`
}

function schedules ({store, state}) {
  return yo`
    <div>
        <header>
            <h1>List of schedules</h1>
        </header>
        ${state.isLoading ? loading() : scheduleList(store.schedules)}
    </div>`
}

schedules.onEnter = require('../actions/load-schedules')

module.exports = schedules
