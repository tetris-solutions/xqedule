const yo = require('yo-yo')
const moment = require('moment')
const loadOneProcess = require('../actions/load-one-process')
const loading = require('./loading')
const assign = require('lodash/assign')
const mean = require('lodash/mean')
const bytes = require('pretty-bytes')

let timeout

function processDescription ({command, cpu_usage, memory_usage, creation, end, exit_code, log}) {
  function exitCodeDd () {
    let text = '--'
    let color = 'darkgrey'

    if (exit_code !== null) {
      text = exit_code
      color = exit_code === 0 ? 'green' : 'red'
    }

    return yo`<dd style="font-weight: bold; color: ${color}">${text}</dd>`
  }

  return yo`
    <main>
      <pre>$ ${command}</pre>
      <dl>
          <dt>Start</dt>
          <dd>${moment(creation).format('LLLL')}</dd>
          <dt>Duration</dt>
          <dd>${end ? moment(end).from(moment(creation), true) : '--'}</dd>
          <dt>Exit code</dt>
          ${exitCodeDd()}
          <dt>CPU usage</dt>
          <dd>${cpu_usage.length ? mean(cpu_usage).toFixed(2) + '%' : '--'}</dd>
          <dt>Memory footprint</dt>
          <dd>${memory_usage.length ? bytes(mean(memory_usage)) : '--'}</dd>
          <pre style='background: black; color: green; width: 90%; overflow-x: auto; margin: 1em auto'>${log}</pre>
      </dl>
    </main>`
}

function processView (context) {
  const {store, state, params} = context

  if (!state.isLoading && !store.process.end) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {

    }, 3 * 1000)
  }

  return yo`
    <div>
        <header>
            <h1>Process information #${params.processId}</h1>        
        </header>
        ${state.isLoading ? loading() : processDescription(store.process)}
    </div>`
}

processView.onEnter = context =>
  loadOneProcess(context)
    .then(() => {
      const {process} = context.store

      process.log = ''

      const eventSource = new window.EventSource(`/api/process/${process.id}/watch`)

      let closed = false

      eventSource.onmessage = ({data}) => {
        if (closed || !context.store.process) return

        let obj

        try {
          obj = JSON.parse(data)
        } catch (e) {
          // ~
        }

        if (obj && typeof obj.log !== 'undefined') {
          process.log += `${obj.log}\n`
        } else {
          assign(process, obj)
        }

        context.save()
      }

      eventSource.addEventListener('end', () => {
        eventSource.close()
        closed = true
      })

      eventSource.onerror = () => {
        closed = true
      }

      context.onleave = () => {
        eventSource.close()
      }
    })

module.exports = processView
