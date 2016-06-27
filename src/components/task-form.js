const http = require('../http')
const yo = require('yo-yo')
const set = require('lodash/set')
const map = require('lodash/map')
const page = require('page')

const defaultParam = n => ({
  name: 'param_' + n,
  description: `Parameter ${n}`
})

function taskForm ({state, save, params}) {
  const isNewTask = !params.taskId

  function onChange ({target}) {
    set(state, target.name, target.value)
    save()
  }

  /**
   * intercepts submit event and sends POST to create task api
   * @param {Event} e submit event
   * @returns {undefined}
   */
  function onSubmit (e) {
    e.preventDefault()

    const newTask = {
      id: params.taskId || e.target.elements.id.value,
      name: e.target.elements.name.value,
      command: e.target.elements.command.value,
      params: {}
    }

    state.params.forEach(({name, description}) => {
      newTask.params[name] = description
    })

    const promise = isNewTask
      ? http.POST('/api/task', {body: newTask})
      : http.PUT(`/api/task/${params.taskId}`, {body: newTask})

    promise.then(() => page('/'))
  }

  function addParam (e) {
    e.preventDefault()
    state.params.push(defaultParam(state.params.length + 1))
    save()
  }

  function removeParamAt (index, e) {
    e.preventDefault()
    state.params.splice(index, 1)
    save()
  }

  state.id = state.id || Math.random().toString(36).substr(2)
  state.name = state.name || 'New task'
  state.params = state.params || [defaultParam(1)]

  function paramInput ({name, description}, index) {
    return yo`
      <fieldset>
        <legend>Param #${index + 1}</legend>
        <p>
            <label>Name</label>
            <input name='params.${index}.name' value=${name} onchange=${onChange} required />
        </p>
        <p>
            <label>Description</label>
            <input name='params.${index}.description' value=${description} onchange=${onChange} required />
        </p>
        <a href='' onclick=${removeParamAt.bind(null, index)}>remove</a>
      </fieldset>`
  }

  return yo`
    <main>
      <form onsubmit=${onSubmit}>
          ${isNewTask ? yo`<p>
              <label>Task id</label>
              <input name='id' value=${state.id} onchange=${onChange} required />
          </p>` : ''}
          <p>
              <label>Task name</label>
              <input name='name' value=${state.name || ''} onchange=${onChange} required />
          </p>
          <p>
              <label>Command</label>
              <input name='command' value=${state.command || ''} onchange=${onChange} required />
          </p>
          
          ${map(state.params, paramInput)}
          
          <br>
          
          <button onclick=${addParam}>add param</button>
          <button type='submit'>save</button>
      </form>
    </main>`
}

module.exports = taskForm
