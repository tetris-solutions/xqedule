const assign = require('lodash/assign')
const shortid = require('shortid')
const restify = require('restify')
const configs = require('../knexfile')
const env = process.env.NODE_ENV || 'development'
const db = require('knex')(configs[env])
const server = restify.createServer()
const map = require('lodash/map')

server.use(restify.CORS())
server.use(restify.queryParser())
server.use(restify.bodyParser())

const parseParams = s => {
  try {
    return assign({}, s, {params: JSON.parse(s.params)})
  } catch (e) {
    return null
  }
}

server.get('/api/tasks', function (req, res, next) {
  db.select('*')
    .from('task')
    .then(tasks => res.json(map(tasks, parseParams)))
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.get('/api/schedules', function (req, res, next) {
  db.select('*')
    .from('schedule')
    .then(schedules => res.json(map(schedules, parseParams)))
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.get('/api/schedule/:id', function (req, res, next) {
  db.first('*')
    .from('schedule')
    .where('id', req.params.id)
    .then(schedule => {
      if (!schedule) {
        return next(new restify.NotFoundError('Schedule not found'))
      }
      res.json(parseParams(schedule))
    })
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.post('/api/schedule', function (req, res, next) {
  const schedule = assign({}, req.body, {
    id: shortid(),
    params: req.body.params ? JSON.stringify(req.body.params) : null,
    creation: (new Date()).toISOString()
  })

  db.insert(schedule)
    .into('schedule')
    .then(() => res.json(201, {id: schedule.id}))
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.del('/api/schedule/:id', function (req, res, next) {
  db('schedule')
    .where('id', req.params.id)
    .del()
    .then(() => res.send(204, ''))
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.listen(10171)
