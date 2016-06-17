const yo = require('yo-yo')
const page = require('page')
const pick = require('lodash/pick')
const curry = require('lodash/curry')
const assign = require('lodash/assign')

let el
let currentContext

class XQedule {
  constructor () {
    this.store = {
      schedule: null,
      schedules: [],
      tasks: []
    }
  }
}

const xqedule = window.xqedule = new XQedule()

const update = newElem => {
  if (el) {
    yo.update(el, newElem)
  } else {
    el = newElem
    document.body.appendChild(el)
  }
}

const errorComponent = require('./components/error')
const serializeError = err => pick(err, 'stack', 'message', 'code', 'status', 'statusCode')

function onError (context, err) {
  context.state.error = err
  context.save()
  update(errorComponent(context))
}

const wrapComponent = curry((store, component, context) => {
  currentContext = context

  const _save = context.save.bind(context)

  function render () {
    if (currentContext !== context) return

    if (context.state.error) {
      return update(errorComponent(context))
    }

    try {
      update(component(context))
    } catch (err) {
      onError(context, serializeError(err))
    }
  }

  delete context.state.isLoading
  store.local = context.state
  context.store = store

  context.save = () => {
    _save()
    render()
  }

  render()
})

const asyncComponent = curry((component, context) => {
  if (context.state.isLoading === undefined) {
    context.state.isLoading = true

    component.onEnter(context)
      .then(r => {
        context.state.isLoading = false
        context.save()
        return r
      })
      .catch(r => {
        onError(context, assign(serializeError(r), serializeError(r.data)))
      })
  }

  return component(context)
})

const createView = curry((store, component) =>
  wrapComponent(store, component.onEnter
    ? asyncComponent(component)
    : component))

const view = createView(xqedule.store)

page('/', view(require('./components/schedules')))
page('/create', view(require('./components/create-schedule')))
page('/schedule/:scheduleId', view(require('./components/schedule')))
page('*', view(require('./components/not-found')))
page()
