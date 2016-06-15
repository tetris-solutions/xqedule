const uniqConfig = {
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: './xqedule.sqlite'
  }
}

module.exports = {
  development: uniqConfig,
  production: uniqConfig
}
