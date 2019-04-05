const express = require('express')
const notifier = require('democracyos-notifier')
const pick = require('lodash.pick')
const middlewares = require('lib/api-v2/middlewares')
const { isCitizenOnProposal } = require('../../proposals')
const api = require('lib/db-api')
var utils = require('lib/utils')
var expose = utils.expose

const app = module.exports = express.Router()

const EDITABLE_KEYS = [
  'forum',
  'mediaTitle',
  'tags',
  'attrs.nombre',
  'attrs.domicilio',
  'attrs.documento',
  'attrs.telefono',
  'attrs.email',
  'attrs.barrio',
  'attrs.problema',
  'attrs.solucion',
  'attrs.beneficios',
]

class CantUploadProposal extends Error {
  constructor () {
    super('User can not upload proposal.')
    this.status = 403
    this.code = 'UPLOAD_TOPIC_FORBIDDEN'
  }
}

const defaultValues = () => ({
  'attrs.anio': '2020',
  'attrs.state': 'pendiente',
  'action.method': 'cause',
  tag: '59665fe8724f61003327eb2f'
})

// Only allow to edit specific keys when is a proposal
// and the users doesn't have forum privileges.
const purgeBody = (req, res, next) => {
  if (isCitizenOnProposal(req.user, req.forum)) {
    // return next(new CantUploadProposal())
    req.body = Object.assign(
      defaultValues(),
      pick(req.body, EDITABLE_KEYS)
    )
  } else {
    req.body = Object.assign(
      defaultValues(),
      req.body
    )
  }
  return next()
}

const sendToAdmin = (req, res, next) => {
  // console.log(req.body)
  notifier.now('new-proposal', {
    topic: {
      mediaTitle: req.body.mediaTitle,
      tags: req.body.tags,
      nombre: req.body['attrs.nombre'],
      domicilio: req.body['attrs.domicilio'],
      documento: req.body['attrs.documento'],
      telefono: req.body['attrs.telefono'],
      email: req.body['attrs.email'],
      barrio: req.body['attrs.barrio'],
      problema: req.body['attrs.problema'],
      solucion: req.body['attrs.solucion'],
      beneficios: req.body['attrs.beneficios'],
    }
  }).then(() => {
    next()
  }).catch(next)
}


// continue to original DemocracyOS's Route
const goToNextRoute = (req, res, next) => next('route')

app.post('/topics',
middlewares.users.restrict,
middlewares.forums.findFromBody,
middlewares.forums.privileges.canCreateTopics,
purgeBody,
sendToAdmin,
goToNextRoute)

app.put('/topics/:id',
middlewares.users.restrict,
middlewares.topics.findById,
middlewares.forums.findFromTopic,
middlewares.forums.privileges.canCreateTopics,
middlewares.topics.privileges.canEdit,
purgeBody,
goToNextRoute)

app.get('/all-tags',
(req, res, next) => {
  try{
    api.tag.all(function (err, tags) {
    if (err) return _handleError(err, req, res)
    res.status(200).json(tags.map(expose('id name')))
    })
  } catch(err){
    next(err)
  }
})
