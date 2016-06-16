const assign = require('lodash/assign')
const shortid = require('shortid')
const restify = require('restify')
const emitter = require('./emitter')
const db = require('./db')
const server = restify.createServer()
const map = require('lodash/map')

server.use(restify.CORS())
server.use(restify.queryParser())
server.use(restify.bodyParser())

const addParsedParams = s => {
  try {
    return assign({}, s, {params: JSON.parse(s.params)})
  } catch (e) {
    return null
  }
}

server.get('/api/tasks', function (req, res, next) {
  return db.select('*')
    .from('task')
    .then(tasks => res.json(map(tasks, addParsedParams)))
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.get('/api/schedules', function (req, res, next) {
  return db.select('*')
    .from('schedule')
    .then(schedules => res.json(map(schedules, addParsedParams)))
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.get('/api/schedule/:id', function (req, res, next) {
  return db.first('*')
    .from('schedule')
    .where('id', req.params.id)
    .then(schedule => {
      if (!schedule) {
        return next(new restify.NotFoundError('Schedule not found'))
      }
      res.json(addParsedParams(schedule))
    })
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.post('/api/schedule', function (req, res, next) {
  const schedule = assign({}, req.body, {
    id: shortid(),
    params: req.body.params ? JSON.stringify(req.body.params) : null,
    creation: (new Date()).toISOString()
  })

  return db.insert(schedule)
    .into('schedule')
    .then(() => {
      emitter.emit('schedule::insert', schedule)

      res.json(201, {id: schedule.id})
    })
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.del('/api/schedule/:id', function (req, res, next) {
  return db('schedule')
    .where('id', req.params.id)
    .del()
    .then(() => {
      emitter.emit('schedule::delete', req.params.id)

      res.send(204, '')
    })
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.listen(10171)
