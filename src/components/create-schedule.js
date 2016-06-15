const yo = require('yo-yo')
const moment = require('moment')
const find = require('lodash/find')
const set = require('lodash/set')
const http = require('../http')
const page = require('page')
const map = require('lodash/map')
const range = require('lodash/range')
const timezones = require('../../timezones.json')
const capitalize = require('lodash/capitalize')
const padStart = require('lodash/padStart')
const flatten = require('lodash/flatten')
const sortBy = require('lodash/sortBy')

const fmtTz = str => str.replace(/_/g, ' ').split('/').reverse().join(', ')
const timezoneList = sortBy(flatten(map(timezones, ({utc}) =>
  map(utc || [], str => ({
    text: fmtTz(str),
    value: str
  })))), 'text')

function scheduleParam (name, id) {
  return yo`
    <p>
      <label>${name}</label>
      <input name='params.${id}' required />
    </p>`
}

const months = range(1, 13)
const daysOfMonth = range(1, 32)
const daysOfWeek = range(7)
const hours = range(24)
const minutes = range(60)
const seconds = minutes

const tomorrow = () => {
  const d = moment().add(1, 'day')

  return d.format('YYYY-MM-DD') + 'T' + d.format('HH:mm')
}

function dynamicTime (state, onChange) {
  function timeSelect ([ls, name]) {
    return yo`
      <p>
        <label>${capitalize(name) + 's'}</label>
        <select name='${name}' onchange=${onChange}>
            <option value=''>*</option>
            ${map(ls, val => yo`
                <option ${val === state[name] ? 'selected' : ''} value='${val}'>
                  ${padStart(val, 2, '0')}
                </option>`)}
        </select>
      </p>`
  }

  return yo`
    <div>
      <p>
          <label>Timezone</label>
          <select name='timezone' onchange=${onChange} required>
              <option value=''>-- select --</option>
              ${map(timezoneList, ({text, value}) => yo`
                  <option ${value === state.timezone ? 'selected' : ''} value='${value}'>
                    ${text}
                  </option>`)}
          </select>
      </p>
      <p>
          <label>Day of month</label>
          <select name='day_of_month' onchange=${onChange}>
              <option value=''>*</option>
              ${map(daysOfMonth, day => yo`
                  <option ${day === state.day_of_month ? 'selected' : ''} value='${day}'>
                    ${padStart(day, 2, '0')}
                  </option>`)}
          </select>
      </p>
      
      <p>
          <label>Day of week</label>
          <select name='day_of_week' onchange=${onChange}>
              <option value=''>*</option>
              ${map(daysOfWeek, day => yo`
                  <option ${day === state.day_of_week ? 'selected' : ''} value='${day}'>
                    ${moment().day(day).format('dddd')}
                  </option>`)}
          </select>
      </p>
      
      <p>
          <label>Month</label>
          <select name='month' onchange=${onChange}>
              <option value=''>*</option>
              ${map(months, month => yo`
                  <option ${month === state.month ? 'selected' : ''} value='${month}'>
                    ${moment().month(month - 1).format('MMMM')}
                  </option>`)}
          </select>
      </p>
      
      ${map([[hours, 'hour'], [minutes, 'minute'], [seconds, 'second']], timeSelect)}
  </div>`
}
function timestampInput (state, onChange) {
  return yo`
    <p>
      <label>Timestamp</label>
      <input type='datetime-local'
            name='timestamp'
            value='${state.timestamp}'
            onchange=${onChange}
            required />
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

    if (newSchedule.timestamp) {
      newSchedule.timestamp = moment(newSchedule.timestamp).toISOString()
    }

    delete newSchedule.mode

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

  const onChange = ({target: {value, name}}) => {
    state[name] = value
    save()
  }

  state.timestamp = state.timestamp || tomorrow()
  state.mode = state.mode || 'dynamic'

  const selectedTask = state.task && state.task.id
  const params = state.task && state.task.params

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
                <option value='${id}' ${selectedTask === id ? 'selected' : ''}>
                    ${name}
                </option>`)}
            </select>
          </p>
          
          ${map(params, scheduleParam)}
          
          ${map(['dynamic', 'timestamp'], value => yo`
              <label>
                <input type='radio'
                      name='mode'
                      onchange=${onChange}
                      value=${value}
                      ${state.mode === value ? 'checked' : ''} />
                       
                ${capitalize(value)} schedule
              </label>`)}
          
          ${state.mode === 'dynamic' ? dynamicTime(state, onChange) : timestampInput(state, onChange)}
          
          <a href='/'>cancel</a> <button type='submit'>Create</button>
        </form>
      </main>
    </div>`
}

createSchedule.onEnter = require('../actions/load-tasks')

module.exports = createSchedule
