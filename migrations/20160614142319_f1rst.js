exports.up = function (knex, Promise) {
  return knex.schema
    .createTable('task', function (table) {
      table.string('id', 40).primary()
      table.string('name', 100).notNullable()
      table.text('command').notNullable()
      table.text('params')
      table.text('creation').notNullable()
    })
    .createTable('schedule', function (table) {
      table.string('id', 20).primary()
      table.string('timezone', 100)

      table.string('task', 40)
        .references('id')
        .inTable('task')
        .onDelete('cascade')
        .onUpdate('restrict')
        .notNullable()

      table.text('params')
      table.text('timestamp')
      table.integer('interval')

      table.integer('day_of_week')
      table.integer('day_of_month')
      table.integer('month')
      table.integer('hour')
      table.integer('minute')
      table.integer('second')

      table.text('creation').notNullable()
    })
    .createTable('process', function (table) {
      table.string('id', 20).primary()
      table.text('command').notNullable()

      table.string('schedule', 20)
        .references('id')
        .inTable('schedule')
        .onDelete('cascade')
        .onUpdate('restrict')
        .notNullable()

      table.text('cpu_usage')
      table.text('memory_usage')

      table.text('log_file').notNullable()

      table.integer('exit_code')

      table.text('creation').notNullable()
      table.text('end')
    })
}

exports.down = function (knex, Promise) {
  return knex.schema
    .dropTable('process')
    .dropTable('schedule')
    .dropTable('task')
}
