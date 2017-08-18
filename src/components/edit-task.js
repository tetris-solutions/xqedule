const taskForm = require('./task-form')
const loading = require('./loading')
const yo = require('yo-yo')
const forEach = require('lodash/forEach')

function injectState (context) {
  const {store, state} = context

  state.name = state.name || store.task.name
  state.id = state.id || store.task.id
  state.command = state.command || store.task.command

  if (!state.params) {
    state.params = []
    forEach(store.task.params, (description, name) => {
      state.params.push({name, description})
    })
  }

  return context
}

function editTask (context) {
  const {store, state, params} = context
  return yo`
    <div>
        <header>
            <h1>Edit task "${store.task ? store.task.name : params.taskId}"</h1>
        </header>
        <hr>
        ${state.isLoading ? loading() : taskForm(injectState(context))}
    </div>`
}

editTask.onEnter = require('../actions/load-one-task')

module.exports = editTask
