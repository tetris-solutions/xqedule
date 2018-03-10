exports.up = function (knex, Promise) {
  return knex.schema
    .table('schedule', function (table) {
      table.string('mode', 100)
    })
}

exports.down = function (knex, Promise) {
  return knex.schema
    .table('schedule', function (table) {
      table.dropColumn('mode')
    })
}
