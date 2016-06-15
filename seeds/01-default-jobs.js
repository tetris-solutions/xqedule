exports.seed = function (knex, Promise) {
  return Promise.join(
    knex('task').del(),

    knex('task').insert([{
      id: 'auto-budget',
      command: '~/code/adpeek-api/bin/auto-budget.php {{company}} {{platform}} --persist',
      name: 'Auto Budget Routine',
      params: JSON.stringify({
        company: 'Company ID',
        platform: 'Platform (adwords, facebook)'
      }),
      creation: new Date().toISOString()
    }])
  )
}
