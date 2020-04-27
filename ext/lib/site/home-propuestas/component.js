import React, { Component } from 'react'
import { browserHistory } from 'react-router'
import config from 'lib/config'
import forumStore from 'lib/stores/forum-store/forum-store'
import topicStore from 'lib/stores/topic-store/topic-store'
import userConnector from 'lib/site/connectors/user'
import TopicCard from './topic-card/component'
import BannerListadoTopics from 'ext/lib/site/banner-listado-topics/component'

const filters = {
  newest: {
    text: 'Más Nuevas',
    sort: 'newest',
    filter: (topic) => topic.status === 'open',
    emptyMsg: 'No se encontraron propuestas.'
  },
  popular: {
    text: 'Más Populares',
    sort: 'popular',
    filter: (topic) => topic.status === 'open',
    emptyMsg: 'No se encontraron propuestas.'
  }
}

const filter = (key, items = []) => items.filter(filters[key].filter)

const propuestasAbiertas = config.propuestasAbiertas
const ListTools = ({ onChangeFilter, activeFilter, handleState, archivadasIsActive }) => (
  <div className='container'>
    { propuestasAbiertas &&
      <div className="row">
        <div className='notice'>
          <h1>{config.propuestasTextoAbiertas}</h1>
        </div>
      </div>
    }
    <div className='row'>
      <div className='col-md-8 list-tools'>
        <div className='topics-filter'>
          {Object.keys(filters).map((key) => (
            <button
              key={key}
              className={`btn btn-secondary btn-sm ${activeFilter === key ? 'active' : ''}`}
              onClick={() => onChangeFilter(filters[key].sort)}>
              {filters[key].text}
            </button>
          ))}
          <button
            className={`btn btn-secondary btn-sm ${archivadasIsActive ? 'active' : ''}`}
            onClick={ handleState }>
            Archivadas
          </button>
        </div>

        { propuestasAbiertas &&
          <a
            href='/formulario-propuesta'
            className='boton-azul btn propuesta'>
            Mandá tu propuesta
          </a>
        }
      </div>
      { !propuestasAbiertas &&
        <span className='alert-duedate' >
          <span className="text-info">Formulario cerrado, ¡Gracias por participar!</span><br />
          {config.propuestasTextoCerradas}
        </span>
      }
    </div>
  </div>
)

class HomePropuestas extends Component {
  constructor () {
    super()

    this.state = {
      page: 1,
      noMore: false,
      forum: null,
      topics: null,
      filter: 'popular',
      archivadas: false
    }
    this.handleInputChange = this.handleInputChange.bind(this)
    this.handleStateChange = this.handleStateChange.bind(this)
  }

  componentDidMount () {
    const u = new window.URLSearchParams(window.location.search)
    if (u.get('sort') === 'newest') this.setState({ filter: 'newest' })
    forumStore.findOneByName('proyectos')
      .then((forum) => {
        return Promise.all([
          forum,
          this.fetchTopics(this.state.page)
        ])
      })
      .then(([forum, topics]) => {
        this.setState({
          forum,
          topics: filter(this.state.filter, topics)
        })
      })
      .catch((err) => { throw err })
  }

  handleInputChange = (evt) => {
    evt.preventDefault()
    const { value, name } = evt.target
    this.setState({
      [name]: value,
      page: 1
    }, () => this.changeTopics())
  }

  handleStateChange () {
    this.setState({
      archivadas: !this.state.archivadas,
      page: 1
    }, () => this.changeTopics())
    // fix bug que el botón de "Archivadas" parecía como prendido (:focus/:active)
    // después de desactivarlo/apagarlo
    if (document.activeElement != document.body) document.activeElement.blur();
  }

  changeTopics () {
    this.fetchTopics(this.state.page)
      .then((res) => {
        this.setState({ topics: res })
      })
      .catch((err) => { console.error(err) })
  }

  fetchTopics = (page) => {
    const query = {
      forumName: 'proyectos',
      sort: this.state.filter === 'newest' ? 'newest' : 'popular',
      page: page,
      // A MEJORAR: con estos parámetros las no-factibles del 2021 no aparecen en ningún lado
      state: (this.state.archivadas ? 'no-factible,' : '') + 'factible,pendiente,no-factible,integrado,no-ganador,preparacion,compra,ejecucion,finalizado',
      anio: this.state.archivadas ? '2020,2019' : '2021'
    };
    const u = new window.URLSearchParams(window.location.search)
    let queryToArray = Object.keys(query).map((key) => {
      return `${key}=${query[key]}`
    }).join('&')
    return window.fetch(`/ext/api/topics?${queryToArray}`, {
      credentials: 'include'
    })
      .then((res) => res.json())
      .then((res) => res.results.topics)
  }

  paginateForward = () => {
    const page = this.state.page + 1

    this.fetchTopics(page)
      .then((topics) => {
        this.setState({
          topics: this.state.topics.concat(topics),
          noMore: topics.length === 0 || topics.length < 20,
          page
        })
      })
      .catch((err) => { console.error(err) })
  }

  handleFilterChange = (key) => {
    this.setState({ filter: key }, () => {
      this.fetchTopics(1)
        .then((topics) => {
          this.setState({
            topics,
            noMore: topics.length === 0 || topics.length < 20,
            page: 1
          })
        })
        .catch((err) => { console.error(err) })
    })
  }

  handleVote = (id) => {
    const { user } = this.props

    if (user.state.rejected) {
      return browserHistory.push({
        pathname: '/signin',
        query: { ref: window.location.pathname }
      })
    }

    topicStore.vote(id, 'apoyo-idea').then((res) => {
      const topics = this.state.topics
      const index = topics.findIndex((t) => t.id === id)
      topics[index] = res
      this.setState({ topics })
    }).catch((err) => { throw err })
  }

  handleSubscribe = (id) => {
    const { user } = this.props

    if (user.state.rejected) {
      return browserHistory.push({
        pathname: '/signin',
        query: { ref: window.location.pathname }
      })
    }

    // WIP
    const subscribeURL =`/api/v2/topics/${id}/subscribe` // TO DO CONFIRM URL
    window.fetch(subscribeURL, {
      credentials: 'include',
      method: 'POST'
    }).then((res) => res.json())
    .then(res => {
      let index = this.state.topics.findIndex(topic => {
        return topic.id == id
      })
      let topicsCopy = this.state.topics
      console.log(res)
      if(res.message === 'Suscribed') {
        if(topicsCopy[index].attrs.subscribers){
          let aux = topicsCopy[index].attrs.subscribers.split(',')
          aux.push(user.state.value.id)
          topicsCopy[index].attrs.subscribers = aux.join(',')
        } else {
          topicsCopy[index].attrs.subscribers = user.state.value.id
        }
      }
      else {
        if(topicsCopy[index].attrs.subscribers){
          let aux = topicsCopy[index].attrs.subscribers.split(',')
          aux = aux.filter( s => s != user.state.value.id)
          topicsCopy[index].attrs.subscribers = aux.join(',')
        }
      }
      this.setState({
        topics: topicsCopy
      })
    }).catch((err) => { throw err })
  }

  render () {
    const { forum, topics } = this.state
    return (

      <div className='ext-home-ideas'>
        <BannerListadoTopics
          btnText='Mandá tu propuesta'
          title='Propuestas'
          />
        <ListTools
          handleState={this.handleStateChange}
          archivadasIsActive={this.state.archivadas}
          activeFilter={this.state.filter}
          onChangeFilter={this.handleFilterChange} />
        <div className='container topics-container'>
          <div className='row'>
            <div className='col-md-12'>
              {topics && topics.length === 0 && (
                <div className='empty-msg'>
                  <div className='alert alert-success' role='alert'>
                    {filters[this.state.filter].emptyMsg}
                  </div>
                </div>
              )}
              {topics && topics.map((topic, i) => (
                <TopicCard
                  onSubscribe={this.handleSubscribe}
                  onVote={this.handleVote}
                  key={`${topic.id}-${i}`}
                  forum={forum}
                  topic={topic} />
              ))}
              {!this.state.noMore && (
                <div className='more-topics'>
                  <button onClick={this.paginateForward}>Ver Más</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default userConnector(HomePropuestas)
