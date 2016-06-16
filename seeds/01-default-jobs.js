exports.seed = function (knex, Promise) {
  return Promise.join(
    knex('task').del(),

    knex('task').insert([
      {
        id: 'auto-budget-test',
        command: 'auto-budget {{company}} {{platform}}',
        name: 'Auto Budget Routine (SIMULATION)',
        params: JSON.stringify({
          company: 'Company ID',
          platform: 'Platform (adwords, facebook)'
        }),
        creation: new Date().toISOString()
      },
      {
        id: 'auto-budget',
        command: 'auto-budget {{company}} {{platform}} --persist',
        name: 'Auto Budget Routine',
        params: JSON.stringify({
          company: 'Company ID',
          platform: 'Platform (adwords, facebook)'
        }),
        creation: new Date().toISOString()
      }
    ])
  )
}
