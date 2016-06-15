const yo = require('yo-yo')
const page = require('page')
const find = require('lodash/find')

let el

const state = {
  schedules: []
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

/**
 * generates a view handler
 * @param {Function} component component to use as view
 * @returns {Function} route handler
 */
const view = component => context => {
  try {
    update(component(context))
  } catch (err) {
    update(errorView(context, err))
  }
}

function scheduleLink ({id, name}) {
  return yo`
    <li>
      <a href='/schedule/${id}'>${name}</a>
    </li>`
}

function schedules (context) {
  return yo`
    <div>
        <header>
            <h1>List of schedules</h1>
        </header>
        <main>
          <a href='/create'>create new</a>
          <hr>
          <ul>
              ${state.schedules.map(scheduleLink)}
          </ul>
        </main>
    </div>`
}

function createSchedule (context) {
  /**
   * intercepts submit event creating a new schedule
   * @param {Event} e submit event
   * @returns {undefined}
   */
  function onSubmitSchedule (e) {
    e.preventDefault()

    state.schedules.push({
      id: Math.random().toString(36).substr(2),
      name: e.target.elements.name.value
    })

    page('/')
  }

  return yo`
    <div>
      <header>
        <h1>Create new schedule</h1>
      </header>
      <main>
        <form onsubmit=${onSubmitSchedule}>
            <label>Name</label>
            <input type='text' name='name'/>
        </form>
      </main>
    </div>
  `
}

function schedule ({params: {scheduleId}}) {
  const data = find(state.schedules, {id: scheduleId})

  if (!data) {
    throw new Error(`Schedule ${scheduleId} was not found`)
  }

  return yo`
    <div>
        <header>
            <h1>${data.name} <small>#${data.id}</small></h1>
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
page('/schedule/:scheduleId', view(schedule))
page('*', view(notFound))
page()
