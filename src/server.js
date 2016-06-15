const assign = require('lodash/assign')
const shortid = require('shortid')
const restify = require('restify')
const configs = require('../knexfile')
const env = process.env.NODE_ENV || 'development'
const db = require('knex')(configs[env])
const server = restify.createServer()

server.use(restify.CORS())
server.use(restify.queryParser())
server.use(restify.bodyParser())

server.get('/api/schedules', function (req, res, next) {
  db.select('*')
    .from('schedule')
    .then(schedules => res.json(schedules))
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.post('/api/schedule', function (req, res, next) {
  const schedule = assign({}, req.body, {
    id: shortid()
  })

  db.insert(schedule)
    .into('schedule')
    .then(() => res.json(201, {id: schedule.id}))
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.listen(10171)
