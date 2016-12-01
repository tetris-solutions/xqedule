const path = require('path')
const uniqConfig = {
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: path.join(__dirname, 'xqedule.sqlite')
  }
}

module.exports = {
  development: uniqConfig,
  production: uniqConfig
}
