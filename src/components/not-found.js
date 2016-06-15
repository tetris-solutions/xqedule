const yo = require('yo-yo')

function notFound () {
  return yo`
  <div>
    <header>
        <h1>Not found</h1>
    </header>
    <hr>
    <main>
        <h2>The page you are trying to access does not exists.</h2>    
    </main>
  </div>`
}

module.exports = notFound

