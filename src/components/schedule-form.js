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

function scheduleParam (state, onChange, label, name) {
  name = `params.${name}`

  return yo`
    <p>
      <label>${label}</label>
      
      <input name='${name}'
        onchange=${onChange}
        value='${state[name] !== undefined ? state[name] : ''}'
        required />
    </p>`
}

const months = range(1, 13)
const daysOfMonth = range(1, 32)
const daysOfWeek = range(7)
const hours = range(24)
const minutes = range(60)

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
            <option value='' ${!state[name] && String(state[name]) !== '0' ? 'selected' : ''}>*</option>
            ${map(ls, val => yo`
                <option ${state[name] !== null && Number(val) === Number(state[name]) ? 'selected' : ''} value='${val}'>
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
              <option value='' ${!state.timezone ? 'selected' : ''}>-- select --</option>
              ${map(timezoneList, ({text, value}) => yo`
                  <option ${value === state.timezone ? 'selected' : ''} value='${value}'>
                    ${text}
                  </option>`)}
          </select>
      </p>
      <p>
          <label>Day of month</label>
          <select name='day_of_month' onchange=${onChange}>
              <option value='' ${!state.day_of_month ? 'selected' : ''}>*</option>
              ${map(daysOfMonth, day => yo`
                  <option ${Number(day) === Number(state.day_of_month) ? 'selected' : ''} value='${day}'>
                    ${padStart(day, 2, '0')}
                  </option>`)}
          </select>
      </p>
      
      <p>
          <label>Day of week</label>
          <select name='day_of_week' onchange=${onChange}>
              <option value='' ${!state.day_of_week ? 'selected' : ''}>*</option>
              ${map(daysOfWeek, day => yo`
                  <option ${state.day_of_week !== null && Number(day) === Number(state.day_of_week) ? 'selected' : ''} value='${day}'>
                    ${moment().day(day).format('dddd')}
                  </option>`)}
          </select>
      </p>
      
      <p>
          <label>Month</label>
          <select name='month' onchange=${onChange}>
              <option value='' ${!state.month ? 'selected' : ''}>*</option>
              ${map(months, month => yo`
                  <option ${Number(month) === Number(state.month) ? 'selected' : ''} value='${month}'>
                    ${moment().month(month - 1).format('MMMM')}
                  </option>`)}
          </select>
      </p>
      
      ${map([[hours, 'hour'], [minutes, 'minute']], timeSelect)}
  </div>`
}
function fixedTimeInput (state, onChange) {
  state.timestamp = state.timestamp || tomorrow()

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

/**
 * intercepts submit event creating a new schedule
 * @param {Event} e submit event
 * @returns {undefined}
 */
function onSubmitSchedule (e) {
  e.preventDefault()

  /**
   * submitted form
   * @type {HTMLFormElement}
   */
  const form = e.target
  const mode = form.elements.mode.value
  const newSchedule = {}

  /* eslint-disable */
  for (let item in form.elements) {
    /* eslint-enable */
    const input = form.elements[item]
    const name = form.elements[item]['name']

    if (name >= 'a' && input instanceof window.HTMLElement && input.value !== '') {
      set(newSchedule, name, input.value)
    }
  }

  switch (mode) {
    case 'fixed':
      newSchedule.timestamp = moment(newSchedule.timestamp).toISOString()
      break

    case 'interval':
      newSchedule.interval = parseInt(Number(newSchedule.interval.value)) * Number(newSchedule.interval.multiplier)
      break

    case 'dynamic':
      const selectedPart = find([
        'day_of_week',
        'day_of_month',
        'month',
        'hour',
        'minute'
      ], name => newSchedule[name] !== undefined)

      if (selectedPart === undefined) {
        /**
         * input
         * @type {HTMLInputElement}
         */
        const input = form.elements.hour

        input.setCustomValidity('Please select at least one of the date parts')
        input.reportValidity()
        return
      }
      break
  }

  const nullableFields = [
    'timezone',
    'day_of_week',
    'day_of_month',
    'month',
    'hour',
    'minute',
    'interval',
    'timestamp'
  ]

  nullableFields.forEach(field => {
    if (newSchedule[field] === undefined) {
      newSchedule[field] = null
    }
  })

  newSchedule.disabled = form.elements.disabled
    ? form.elements.disabled.checked
    : false

  delete newSchedule['schedule-disabled']

  const promise = form.elements.id
    ? http.PUT(`/api/schedule/${form.elements.id.value}`, {body: newSchedule})
    : http.POST('/api/schedule', {body: newSchedule})

  promise.then(() => page('/'))
}
const intervalUnits = {
  days: 24 * 60 * 60,
  hours: 60 * 60,
  minutes: 60,
  seconds: 1
}

const toNum = n => isNaN(Number(n)) ? 0 : Number(n)

function intervalInput (state, onChange) {
  if (state.interval && !state['interval.value']) {
    if (state.interval >= intervalUnits.days && state.interval % intervalUnits.days === 0) {
      state['interval.multiplier'] = intervalUnits.days
      state['interval.value'] = state.interval / intervalUnits.days
    } else if (state.interval >= intervalUnits.hours && state.interval % intervalUnits.hours === 0) {
      state['interval.multiplier'] = intervalUnits.hours
      state['interval.value'] = state.interval / intervalUnits.hours
    } else if (state.interval >= intervalUnits.minutes && state.interval % intervalUnits.minutes === 0) {
      state['interval.multiplier'] = intervalUnits.minutes
      state['interval.value'] = state.interval / intervalUnits.minutes
    } else {
      state['interval.multiplier'] = intervalUnits.seconds
      state['interval.value'] = state.interval
    }
  }

  return yo`
  <p>
    <label>Every </label>
    
    <input type='number'
        name='interval.value'
        onchange=${onChange}
        value='${toNum(state['interval.value'])}'
        min=${Number(state['interval.multiplier']) === 1 ? 5 : 0}
        required />
        
    <select name='interval.multiplier' onchange=${onChange} required>
        <option value='' ${!state['interval.multiplier'] ? 'selected' : ''}>-- select --</option>
        ${map(intervalUnits, (value, name) => yo`
          <option value=${value} ${Number(state['interval.multiplier']) === Number(value) ? 'selected' : ''}>
            ${capitalize(name)}
          </option>
        `)}
    </select>
  </p>`
}

function scheduleForm ({store, state, save}) {
  const onChange = ({target}) => {
    state[target.name] = target.value

    if (target.value && !target.checkValidity()) {
      target.setCustomValidity('')
    }

    save()
  }

  function toggle () {
    state.disabled = !state.disabled
    save()
  }

  state.mode = state.mode || 'dynamic'

  const periodSelector = {
    dynamic: dynamicTime,
    fixed: fixedTimeInput,
    interval: intervalInput
  }

  function taskConfig () {
    return yo`
      <div>
        <p>
          <input type='hidden' name='task' value='${store.task.id}' />
          <h4>${store.task.name}</h4>
          <pre>$ ${store.task.command}</pre>
        </p>
        ${map(store.task.params, scheduleParam.bind(null, state, onChange))}
      </div>`
  }

  return yo`
    <form onsubmit=${onSubmitSchedule}>
      ${store.schedule ? yo`<input type=hidden name='id' value=${store.schedule.id} />` : ''}
      
      ${store.schedule ? yo`
      <fieldset>
        <legend>Status</legend>
        <input id='schedule-disabled' name='disabled' type="checkbox" ${state.disabled ? 'checked' : ''} onchange=${toggle}/>
        <label for='schedule-disabled'>Disable Schedule</label>
      </fieldset>` : ''}
      
      <fieldset>
            <legend>Task configuration</legend>
            ${state.isLoading ? yo`<p>Loading task...</p>` : taskConfig()}
      </fieldset>
      
      <fieldset>
            <legend>Schedule configuration</legend>
            ${map(['dynamic', 'fixed', 'interval'], value => yo`
            <label>
              <input type='radio'
                    name='mode'
                    onchange=${onChange}
                    value=${value}
                    ${state.mode === value ? 'checked' : ''} />
                     
              ${capitalize(value)} schedule
            </label>`)}
        
            ${periodSelector[state.mode](state, onChange)}                          
      </fieldset>
      <br>
      <button type='submit'>Save</button>
    </form>`
}

module.exports = scheduleForm
