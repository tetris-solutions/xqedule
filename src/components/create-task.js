const http = require('../http')
const yo = require('yo-yo')
const set = require('lodash/set')
const map = require('lodash/map')
const page = require('page')

function createTask ({state, save}) {
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
      id: e.target.elements.id.value,
      name: e.target.elements.name.value,
      command: e.target.elements.command.value,
      params: {}
    }

    state.params.forEach(({name, description}) => {
      newTask.params[name] = description
    })

    http.POST('/api/task', {body: newTask}).then(() => page('/'))
  }

  const defaultParam = n => ({
    name: 'param_' + n,
    description: `Parameter ${n}`
  })

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
        <button onclick=${removeParamAt.bind(null, index)}>remove</button>
      </fieldset>`
  }

  return yo`
    <div>
        <header><h1>Create task</h1></header>
        <main>
            <form onsubmit=${onSubmit}>
                <p>
                    <label>Task id</label>
                    <input name='id' value=${state.id} onchange=${onChange} required />
                </p>
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
        </main>
    </div>`
}

module.exports = createTask
