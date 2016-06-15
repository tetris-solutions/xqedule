const yo = require('yo-yo')
const page = require('page')
const {GET, POST} = require('./http')
const moment = require('moment')
const map = require('lodash/map')
const find = require('lodash/find')
const set = require('lodash/set')

let el

const state = {
  schedule: null,
  schedules: [],
  tasks: []
}

const update = newElem => {
  if (el) {
    yo.update(el, newElem)
  } else {
    el = newElem
    document.body.appendChild(el)
  }
}

const notFound = () => yo`
  <div>
    <header>
        <h1>Not found</h1>
    </header>
    <hr>
    <main>
        <h2>The page you are trying to access does not exists.</h2>    
    </main>
  </div>
`
/**
 * error view
 * @param {Context} context current context
 * @param {Error} error error caught
 * @returns {HTMLElement} new dom element
 */
function errorView (context, error) {
  return yo`
    <div>
      <header>
        <h2>Could not show <a href='${context.path}'>${context.path}</a></h2>
      </header>
      <hr>
      <h3>${error.message}</h3>
      <pre>${error.stack}</pre>
    </div>`
}

let currentContext
/**
 * generates a view handler
 * @param {Function} component component to use as view
 * @returns {Function} route handler
 */
const view = component => context => {
  currentContext = context
  function render () {
    if (currentContext !== context) return

    try {
      update(component(context, render))
    } catch (err) {
      update(errorView(context, err))
    }
  }

  render()
}

function scheduleLink ({id, task, timestamp}) {
  return yo`
    <li>
      <a href='/schedule/${id}'>${task}: ${timestamp}</a>
    </li>`
}

const loadSchedules = () =>
  GET('/api/schedules')
    .then(response => {
      state.schedules = response.data
      return response
    })

const loadOneSchedule = ({params}) =>
  GET(`/api/schedule/${params.scheduleId}`)
    .then(response => {
      state.schedule = response.data
      return response
    })

const loadTasks = () =>
  GET('/api/tasks')
    .then(response => {
      state.tasks = response.data
      return response
    })

function scheduleList () {
  return yo`
    <main>
      <a href='/create'>create new</a>
      <hr>
      <ul>
          ${state.schedules.map(scheduleLink)}
      </ul>
    </main>`
}
function loading () {
  return yo`
    <main>
        <h4>Loading...</h4>    
    </main>
  `
}

function preload (context, render, action) {
  if (context.state.loading === undefined) {
    context.state.loading = true

    action(context).then(() => {
      context.state.loading = false
      context.save()
      render()
    })
  }

  return context.state.loading
}

function schedules (context, render) {
  const isLoading = preload(context, render, loadSchedules)

  return yo`
    <div>
        <header>
            <h1>List of schedules</h1>
        </header>
        ${isLoading ? loading() : scheduleList()}
    </div>`
}

function scheduleParam (name, id) {
  return yo`
    <p>
      <label>${name}</label>
      <input name='params.${id}' />
    </p>`
}

function createSchedule (context, render) {
  preload(context, render, loadTasks)

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

    POST('/api/schedule', {body: newSchedule}).then(() => page('/'))
  }

  /**
   * event handler form task <select>
   * @param {Event} e change event
   * @returns {undefined}
   */
  function onChangeTask (e) {
    const id = e.target.value
    context.state.task = find(state.tasks, {id})
    context.save()
    render()
  }

  const tomorrow = moment().add(1, 'day')
  const tomorrowString = tomorrow.format('YYYY-MM-DD') + 'T' + tomorrow.format('HH:mm')
  const {task} = context.state

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
              
              ${state.tasks.map(({id, name}) => yo`
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

function editSchedule (context, render) {
  const isLoading = preload(context, render, loadOneSchedule)

  if (isLoading) {
    return yo`
      <div>
        <header>
            <h1>Schedule ${context.params.scheduleId}</h1>
        </header>
        <main>
            <p>Loading...</p>        
        </main>
      </div>
    `
  }

  const {schedule} = state

  if (!schedule) {
    throw new Error(`Schedule ${context.params.scheduleId} was not found`)
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
    </div>
  `
}

page('/', view(schedules))
page('/create', view(createSchedule))
page('/schedule/:scheduleId', view(editSchedule))
page('*', view(notFound))
page()
