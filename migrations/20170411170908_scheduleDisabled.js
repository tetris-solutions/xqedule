exports.up = function (knex, Promise) {
  return knex.schema
    .table('schedule', function (table) {
      table.boolean('disabled')
        .defaultTo(false)
    })
}

exports.down = function (knex, Promise) {
  return knex.schema
    .table('schedule', function (table) {
      table.dropColumn('disabled')
    })
}
