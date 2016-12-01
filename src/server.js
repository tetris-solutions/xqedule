'use strict'
const assign = require('lodash/assign')
const omit = require('lodash/omit')
const shortid = require('shortid')
const restify = require('restify')
const emitter = require('./emitter')
const db = require('./db')
const server = restify.createServer()
const map = require('lodash/map')

const safeParseJSON = str => {
  if (!str) return null

  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

server.use((req, res, next) => {
  req.db = db
  next()
})

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
    .orderBy('creation', 'desc')
    .then(schedules => res.json(map(schedules, addParsedParams)))
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.get('/api/schedule/:id', function (req, res, next) {
  return db.first('schedule.*',
    'task.command AS task_command',
    'task.id AS task_id',
    'task.params AS task_params',
    'task.name AS task_name')
    .from('schedule')
    .join('task', 'task.id', 'schedule.task')
    .where('schedule.id', req.params.id)
    .then(schedule => {
      if (!schedule) {
        return next(new restify.NotFoundError('Schedule not found'))
      }

      schedule = assign(
        {
          task: addParsedParams({
            command: schedule.task_command,
            id: schedule.task_id,
            name: schedule.task_name,
            params: schedule.task_params
          })
        }, omit(schedule,
          'task',
          'task_id',
          'task_command',
          'task_params',
          'task_name'))

      return db.select()
        .from('process')
        .where('schedule', schedule.id)
        .orderBy('id', 'desc')
        .limit(20)
        .then(ps => {
          schedule.processes = map(ps, p => {
            p.cpu_usage = safeParseJSON(p.cpu_usage) || []
            p.memory_usage = safeParseJSON(p.memory_usage) || []
            return p
          })

          res.json(addParsedParams(schedule))
        })
    })
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.get('/api/process/:id', function (req, res, next) {
  return db.first('*')
    .from('process')
    .where('id', req.params.id)
    .then(process => {
      if (!process) {
        return next(new restify.NotFoundError('Process not found'))
      }

      process.cpu_usage = safeParseJSON(process.cpu_usage) || []
      process.memory_usage = safeParseJSON(process.memory_usage) || []

      res.json(process)
    })
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.get('/api/task/:id', function (req, res, next) {
  return db.first('*')
    .from('task')
    .where('id', req.params.id)
    .then(task => {
      if (!task) {
        return next(new restify.NotFoundError('Task not found'))
      }

      res.json(addParsedParams(task))
    })
    .catch(err => next(new restify.InternalServerError(err.message)))
})

server.post('/api/task', function (req, res, next) {
  const task = {
    id: req.body.id,
    name: req.body.name,
    command: req.body.command,
    params: req.body.params ? JSON.stringify(req.body.params) : null,
    creation: (new Date()).toISOString()
  }

  return db.insert(task)
    .into('task')
    .then(() => {
      emitter.emit('task::insert', task)
      res.json(201, {id: task.id})
    })
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.del('/api/task/:id', function (req, res, next) {
  return db('task')
    .where('id', req.params.id)
    .del()
    .then(() => {
      emitter.emit('task::delete', req.params.id)

      res.send(204, '')
    })
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.post('/api/schedule', function (req, res, next) {
  const schedule = assign({}, req.body, {
    id: shortid(),
    params: req.body.params ? JSON.stringify(req.body.params) : null,
    creation: (new Date()).toISOString()
  })

  // @todo: validate params

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

      res.send(204)
    })
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.put('/api/schedule/:id', function (req, res, next) {
  const {id} = req.params
  const immutableScheduleAttributes = ['id', 'task', 'creation']
  const changes = omit(req.body, immutableScheduleAttributes)

  if (changes.params) {
    changes.params = JSON.stringify(changes.params)
  }

  return db('schedule')
    .where('id', id)
    .update(changes)
    .then(() => {
      emitter.emit('schedule::update', assign({id}, changes))

      res.send(204)
    })
    .catch(err => next(new restify.ConflictError(err.message)))
})

server.put('/api/task/:id', function (req, res, next) {
  const {id} = req.params
  const immutableAttributes = ['id', 'creation']
  const changes = omit(req.body, immutableAttributes)

  if (changes.params) {
    changes.params = JSON.stringify(changes.params)
  }

  return db('task')
    .where('id', id)
    .update(changes)
    .then(() => {
      emitter.emit('task::update', assign({id}, changes))

      res.send(204)
    })
    .catch(err => next(new restify.ConflictError(err.message)))
})

const cleanup = require('./cleanup').cleanup

server.get('/api/cleanup', function (req, res, next) {
  cleanup()

  res.send('Cleanup started...')
})

require('./log-event-source')(server, db)

server.listen(10171)
