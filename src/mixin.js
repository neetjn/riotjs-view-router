import constants from './constants'
import utils from './utils'

/**
 * Represents the riot-view-router mixin.
 * @constructor
 * @param (object) options - Router options.
 * @param (array) states - States for router to read from.
 */
class Router {

  constructor(options, states) {

    let self = this.$router = {  }

    Object.defineProperty(self, 'location', {
      get: function() {
        return window.location.hash
      },
      set: function(location) {
        window.location.hash = location
      }
    })

    self.$utils = utils

    /**
     * Used to navigate with hash pattern.
     * @param (string) route - Route to relocate to.
     */
    self.navigate = function(route) {
      self.location = '#!' + route
    }

    /**
     * Used to change states.
     * @param (string) name - Name of state to transition to.
     */
    self.pushState = function(name) {
      let state = self.$utils.stateByName(name)
      let location = self.location.split('#!')[1]

      if (location !== state.route.route) {
        if (!state.route.variables.length) {
          self.navigate(state.route.route)
          return // # assume function will be retriggered
        }
        else {
          if (self.debugging) {
            console.warn(`State "${name}" does not match current route.`)
            console.warn('Could not re-route due to route variables.')
          }
        }
      }

      if (self.onBeforeStateChange) {
        self.onBeforeStateChange(state)
      }
      if (self.$state && self.$state.onLeave) {
        self.$state.onLeave(state)
      } // # call onLeave, pass old state
      self.transition(state)
      if (self.onStateChange) {
        self.onStateChange(state)
      }
      if (state.onEnter) {
        state.onEnter(state)
      } // # call onEnter, pass new state
      self.$state = state
    }

    /**
     * Used to mount state.
     * @param (object) state - State object for mounting.
     */
    self.transition = function(state) {
      let variables = self.$utils.extractRouteVars(state)
      if (self.$state) {
        let tag = riot.util.vdom.find((tag) => tag.root.localName == self.$state.tag)
        if (!tag) throw Error('Could not find a matching tag to unmount')
        tag.unmount()
      }
      let node = document.createElement(state.tag)
      let opts = { }
      variables.forEach((variable) => {
        opts[variable.name] = variable.value
      }) // # add props
      self.context.appendChild(node)
      riot.mount(state.tag, opts)
      let title = state.title
      variables.forEach((variable) => title = title.replace(`<${variable.name}>`, variable.value))
      document.title = title
    }

    /**
     * Used to initialize the router and listeners.
     */
    self.start = function() {
      if (!self.location) {
        window.location.hash = `#!${ self.$utils.stateByName(self.defaultState).route.route }`
      } // # route to default state
      self.context_id = '$' + new Date().getTime().toString()
      window[self.context_id] = window.setInterval(function() {
        let context = document.querySelector(self.marker) || document.querySelector(`[${self.marker}]`)
        if (context) {
          self.context = context
          self.pushState(self.$utils.stateByRoute().name) // # route to initial state
          window.onhashchange = function() {
            self.pushState(self.$utils.stateByRoute().name) // # update state
          } // # create listener for route changes
          window.clearInterval(window[self.context_id])
        }
      }, 250) // # search for view context
    }

    let requiredOptions = ['defaultState']
    let optionalDefaultOptions = ['debugging', 'fallbackState', 'onBeforeStateChange', 'onStateChange']
    let acceptedOptions = requiredOptions.concat(optionalDefaultOptions)

    for (let option in options) {
      if (acceptedOptions.indexOf(option) == -1) {
        throw Error(`Unknown option "${option} is not supported`)
      }
    } // # validate router optionsu

    self = Object.assign(self, options)

    self.debugging = self.debugging || false

    let stateProperties = ['name', 'route', 'tag']
    states = !Array.isArray(states) ? [states] : states
    states.forEach((state) => {
      if (!state.name.match(self.regex.stateName)) {
        throw Error(`Invalid state name "${state.name}",\
        state names must be a valid alphanumeric string.`)
      }
    })
    stateProperties.forEach((prop) => {
      states.forEach((state) => {
        if (!state[prop]) {
          throw Error(`Required state option "${prop}" not specified`)
        }
      })
    }) // # validate state options
    states.forEach(function(item) {
      item.route = self.$utils.splitRoute(item.route)
    }) // # get route pattern
    self.states = states

    if (!self.defaultState) {
      throw Error('Default state must be specified')
    } else {
      if (self.defaultState.indexOf(':') > -1) {
        throw Error(`Default state route cannot take variable parameters`)
      }
      if (!self.$utils.stateByName(self.defaultState)) {
        throw Error(`State "${self.defaultState}" not found in specified states`)
      }
    }

    if (self.fallbackState) {
      if (!self.$utils.stateByName(self.fallbackState)) {
        throw Error(`Fallback state "${self.fallbackState}" not found in specified states`)
      }
    }
    else {
      if (self.debugging) {
        console.warn(`Fallback state not specified, dfaulting to "${self.defaultState}"`)
      }
      self.fallbackState = self.defaultState
    }

    self.marker = self.marker || constants.defaults.marker
    self.start()
  }

}
