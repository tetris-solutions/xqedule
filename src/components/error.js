const yo = require('yo-yo')

function error ({state, path}) {
  return yo`
    <div>
      <header>
        <h2>Could not show <a href='${path}'>${path}</a></h2>
      </header>
      <hr>
      <h3>${state.error.message}</h3>
      <pre>${state.error.stack}</pre>
    </div>`
}

module.exports = error
