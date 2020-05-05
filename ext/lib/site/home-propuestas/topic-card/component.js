import React, { Component } from 'react'
import { Link, browserHistory } from 'react-router'
import moment from 'moment'
import userConnector from 'lib/site/connectors/user'

const estados = (state) => {
  switch (state) {
    case 'no-factible':
      return 'No factible'
      break
    case 'integrado':
      return 'Integrada'
      break
    default:
      return 'Factible'
      break
  }
}

export class TopicCard extends Component {
  componentWillMount() {
    this.setStateFromProps(this.props)
  }

  componentWillReceiveProps(props) {
    this.setStateFromProps(props)
  }
  setStateFromProps(props) {
    const { topic, user } = props

    let userAttrs = user.state.fulfilled && (user.state.value || {})
    let userSuscribed = false
    if(userAttrs && topic.attrs.subscribers){
      let userSuscribers = topic.attrs.subscribers.split(',')
      userSuscribed = userSuscribers.find(user => user === userAttrs.id);
    } else {
      userSuscribed = false
    }

    return this.setState({
      subscribed: !!userSuscribed
    })

  }
  handleWrapperClick = (e) => {
    let targTag = e.target && e.target.tagName
    // si hace click en cualquier lugar que no sea un botón o un link mandar a propuesta
    if (targTag != 'BUTTON' && targTag != 'A')
      browserHistory.push(`/propuestas/topic/${this.props.topic.id}`)
  }
  render() {
    const { topic, onVote, onSubscribe } = this.props
    const { subscribed } = this.state

    const likesCountDiv = (
      <div className={`participants ${topic.voted ? 'voted' : 'not-voted'}`}>
        <span className={`icon-like`} />
        &nbsp;
        {topic.action.count}
      </div>
    )
    const subscribesCountDiv = (
      <div className={`participants ${subscribed ? 'subscribed' : 'not-subscribed'}`}>
        <span className={`icon-bell`} />
        &nbsp;
        {topic.attrs.subscribers && topic.attrs.subscribers.split(',').length || 0}
      </div>
    )

    function capitalizeFirstLetter(str) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    return (
      <div className='ext-topic-card ideas-topic-card' onClick={this.handleWrapperClick}>
        <div className='topic-card-info'>
          <div className='topic-card-attrs'>
            {this.props.barrio &&
              <span className='badge badge-default'>{this.props.barrio.name}</span>
            }
            {topic.attrs.anio &&
              <span className='badge badge-default'>{topic.attrs.anio}</span>
            }
            {topic.attrs.state !== 'pendiente' &&
              <span className={`estado ${topic.attrs.state}`}>{estados(topic.attrs.state)}</span>
            }
          </div>

          <div className='topic-creation'>
            <span>Creado por: <span className='topic-card-author'>{topic.attrs.nombre}</span></span>
            <span
              className={`date ${(topic.attrs.state !== 'pendiente') && 'space'}`}>
              {moment(topic.createdAt).format('D-M-YYYY')}
            </span>
          </div>

          <h1 className='topic-card-title'>
            {topic.mediaTitle}
          </h1>
          <p className='topic-card-description'>
            {createClauses(topic)}
          </p>

        </div>

        <div className='topic-card-footer'>
          { topic.tags && topic.tags.length > 0 && (
              <div className='topic-card-tags'>
                <span className="glyphicon glyphicon-tag"></span>
                {topic.tags.slice(0, 12).map((tag, i) => (
                  <a
                    href={`${window.location.origin + '/propuestas?tags=' + tag}`}
                    key={`${tag}-${i}`}
                    className='tag-wrapper' >
                    {capitalizeFirstLetter(tag)}
                  </a>
                ))}
              </div>
          ) }

          <div className='buttons-wrapper'>
            <div className='cause-wrapper'>
              {topic.voted && (
                <button disabled className='btn btn-primary btn-filled'>
                  Te gusta
                  {likesCountDiv}
                </button>
              )}
              {!topic.voted && (
                <button
                  disabled={!topic.privileges.canVote}
                  onClick={() => onVote(topic.id)}
                  className='btn btn-primary btn-empty'>
                  Me gusta
                  {likesCountDiv}
                </button>
              )}
            </div>

            <div className='subscribe-wrapperr'>
              {subscribed && (
                <button
                  className='btn btn-primary'
                  onClick={() => onSubscribe(topic.id)}>
                  Desuscribirse
                  {subscribesCountDiv}
                </button>
              )}
              {!subscribed && (
                <button
                  disabled={!topic.privileges.canVote}
                  className='btn btn-primary btn-empty'
                  onClick={() => onSubscribe(topic.id)}>
                  Suscribirse
                  {subscribesCountDiv}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    )
  }
}

function createClauses({ attrs, clauses }) {
  let div = document.createElement('div')
  let content
  if (!attrs) {
    content = clauses
      .sort(function (a, b) {
        return a.position > b.position ? 1 : -1
      })
      .map(function (clause) {
        return clause.markup
      })
      .join('')
  } else {
    const { problema, solucion, beneficios } = attrs
    content = `${problema} ${solucion} ${beneficios}`
  }
  div.innerHTML = content
  return div.textContent.replace(/\r?\n|\r/g, '').slice(0, 340) + '...'
}

export default userConnector(TopicCard)
