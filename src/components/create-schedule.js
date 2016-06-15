const yo = require('yo-yo')
const moment = require('moment')
const find = require('lodash/find')
const set = require('lodash/set')
const http = require('../http')
const page = require('page')
const map = require('lodash/map')

function scheduleParam (name, id) {
  return yo`
    <p>
      <label>${name}</label>
      <input name='params.${id}' />
    </p>`
}

function createSchedule ({store, state, save}) {
  /**
   * intercepts submit event creating a new schedule
   * @param {Event} e submit event
   * @returns {undefined}
   */
  function onSubmitSchedule (e) {
    e.preventDefault()

    const newSchedule = {}

    for (const name in e.target.elements) {
      const input = e.target.elements[name]

      if (name >= 'a' && input instanceof window.HTMLElement && input.value !== '') {
        set(newSchedule, name, input.value)
      }
    }

    http.POST('/api/schedule', {body: newSchedule}).then(() => page('/'))
  }

  /**
   * event handler form task <select>
   * @param {Event} e change event
   * @returns {undefined}
   */
  function onChangeTask (e) {
    const id = e.target.value
    state.task = find(store.tasks, {id})
    save()
  }

  const tomorrow = moment().add(1, 'day')
  const tomorrowString = tomorrow.format('YYYY-MM-DD') + 'T' + tomorrow.format('HH:mm')
  const {task} = state

  return yo`
    <div>
      <header>
        <h1>Create new schedule</h1>
      </header>
      <main>
        <form onsubmit=${onSubmitSchedule}>
          <p>
            <label>Task</label>
            
            <select name='task' onchange=${onChangeTask} required>
              <option value=''>-- select --</option>
              
              ${store.tasks.map(({id, name}) => yo`
                <option value='${id}' ${task && task.id === id ? 'selected' : ''}>
                    ${name}
                </option>`)}
            </select>
          </p>
          <p>
              <label>Timestamp</label>
              <input type='datetime-local' name='timestamp' value='${tomorrowString}' required />
          </p>
          
          ${map(task && task.params, scheduleParam)}
          
          <button type='submit'>Create</button>
        </form>
      </main>
    </div>`
}

createSchedule.onEnter = require('../actions/load-tasks')

module.exports = createSchedule
