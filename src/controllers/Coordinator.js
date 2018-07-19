/**
* @module src/controllers
* @author Raziel Carvajal-Gomez  <raziel.carvajal@gmail.com>*/
module.exports = Coordinator
var debug = typeof window === 'undefined' ? require('debug')('coordinator') : require('debug').log
var its = require('its')
var hat = require('hat')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var GossipUtil = require('../utils/GossipUtil')
var PeerJSProtocol = require('../utils/PeerjsProtocol')
var GossipWrapper = require('../utils/GossipWrapper')
var GossipFactory = require('../services/GossipFactory')
var Bootstrap = require('../services/Bootstrap')
var ConnectionManager = require('../controllers/ConnectionManager')
inherits(Coordinator, EventEmitter)
/**
* @class Coordinator
* @description This class coordinates the execution of a set of gossip-based protocols that
* are defined in the configuration object, see
* [configurationObj]{@link module:src/utils.configurationObj}). This class acts as
* an intermediary between the web application and every gossip protocol that is controlled 
* by one instance of the
* [GossipMediator]{@link module:src/controllers.GossipMediator#setDependencies}, via message
* passing. For instance, if the application requires to show the items in the view of
* the protocol "cyclon1", the Coordinator sends the request to the GossipMediator instance
* of "cyclon1". This class contains a group of methods, which actually form the API of WebGC, 
* to enrich the user's application with a P2P gossip communication.
* @param gossConfObj Configuration object of WebGC see the
* [configurationObj]{@link module:src/utils.configurationObj} for more details.
* @param id Unique identifier of the local peer, if this parameter is not specified one
* random ID will be assigned
* @param profile The content of a user's profile is application dependant, basically, 
* any valid Javascript object is allowed*/
function Coordinator (gossConfObj, id, profile) {
  if (!(this instanceof Coordinator)) return new Coordinator(gossConfObj, id, profile)
  EventEmitter.call(this)
  if (!this._checkConfFile(gossConfObj)) return
  its.defined(gossConfObj.signalingService)
  its.defined(gossConfObj.gossipAlgos)
  its.defined(gossConfObj.statsOpts)
  this._id = id || hat()
  this._sigSerOpts = gossConfObj.signalingService
  this.gossipAlgos = gossConfObj.gossipAlgos
  this.algosNames = Object.keys(this.gossipAlgos)
  this.statsOpts = gossConfObj.statsOpts
  this._usingSs = gossConfObj.usingSs
  if (this.statsOpts.activated) {
    this.actCycHistory = {}
    this.vieUpdHistory = {}
  }
  this._maxNumOfCon = 0
  this.gossipUtil = new GossipUtil(debug)
  this.factory = new GossipFactory(this.gossipUtil, this, gossConfObj.userImplementations, profile || 'undefined')
  try {
    debug('Instantiation of gossip protocols starts')
    this.factory.createProtocols(this.gossipAlgos, this.statsOpts)
    debug('Instantiation of gossip protocols is finished')
  } catch (e) {
    debug('During the instantiation of gossip protocols. ' + e)
  }
  this._connectionManager = new ConnectionManager(this._maxNumOfCon)
  this._algosPool = {}
  this._routingTable = {}
  this._extendAttributes()
}
/**
 * @method _extendAttributes
 * @description
 * @param
 */
Coordinator.prototype._extendAttributes = function() {
  this.protocols = {}
  for (var i = 0; i < this.algosNames.length; i ++) {
    this.protocols[this.algosNames[i]] = new GossipWrapper(this, this.algosNames[i], this._id)
  }
}
/**
 * @method _delItemInViews
 * @description
 * @param
 */
Coordinator.prototype._delItemInViews = function (id) {
  for (var i = 0; i < this.algosNames.length; i++) {
    this.workers[this.algosNames[i]].postMessage({ header: 'delete', item: id })
  }
}
/**
* @memberof Coordinator
* @method checkConfFile
* @description The evaluation for knowing if the
* [configuration file]{@link module:src/confObjs#configurationObj} is well structured is performed
* by this method
* @param confObj Configuration object*/
Coordinator.prototype._checkConfFile = function (confObj) {
  debug('Checking if configuration file is well formed')
  its.defined(confObj.signalingService.host, "Host server isn't defined")
  its.string(confObj.signalingService.host, "Host server isn't a string")
  its.defined(confObj.signalingService.port, "Port server isn't defined")
  its.number(confObj.signalingService.port, "Port server isn't a number")
  var keys = Object.keys(confObj.gossipAlgos)
  for (var i = 0; i < keys.length; i++) {
    its.defined(confObj.gossipAlgos[keys[i]].class, "Class type of the protocol isn't defined")
  }
  debug('Configuration file is well formed')
  return true
}
/**
* @memberof Coordinator
* @method start
* @description Basically, this method instantiates: i) the [Peer]{@link http://peerjs.com/docs/#api}
* object, ii) the LookupService (if it is
* specified in the configuration object) and iii) every implementation of the gossip algorithms. In point
* iii one [web worker]{@link http://www.w3schools.com/html/html5_webworkers.asp} environment is created
* per algorithm with an instance of a [GossipMediator]{@link module:src/controllers#GossipMediator} too.
* Additionally, events of [Peer]{@link http://peerjs.com/docs/#api} are set to receive messages of
* external peers.*/
Coordinator.prototype.bootstrap = function () {
  this._sigSer = new PeerJSProtocol(this._id, this._sigSerOpts.host, this._sigSerOpts.port)
  var self = this
  this._sigSer.on('open', function () {
    self._bootSer = new Bootstrap(self._id, self._sigSerOpts.host, self._sigSerOpts.port)
    self._bootSer.on('boot', function (respToBoot) {
      var firstView = []
      if (respToBoot.peer !== 'undefined') {
        var c = self._connectionManager.newConnection(respToBoot.peer, true, true).connection
        self._initConnectionEvents(c)
        self._connectionManager.set(c)
        firstView.push(respToBoot.peer)
      } else debug('I am the first peer in the overlay, eventually other peer will contact me')
      var worker, period
      for (var i = 0; i < self.algosNames.length; i++) {
        worker = self.workers[self.algosNames[i]]
        worker.postMessage({ header: 'firstView', view: firstView })
        period = self.gossipAlgos[self.algosNames[i]].gossipPeriod
        self._bootGossipCycle(self.algosNames[i], worker, period)
      }
    })
    self._bootSer.getPeerToBootstrap()
  })
  this._sigSer.on('idTaken', function () {
    // TODO Coordinator must implement this event if WebGC is open to the public where
    // the peerID must be generated in a random way (via the 'hat' library for instance)
    // avoiding that two peers have the same identifier. Call: self.emit('resetPeerId')
  })
  this._sigSer.on('abort', function () { /* TODO handle as exception */ })
  this._sigSer.on('getFirstPeer', function () {
    // TODO Again these two method must be implemented if WebGC is open to the public
    // self.emit('removeAllConnections') && self._getPeerToBootstrap()
  })
  this._sigSer.on('offer', function (src, payload) {
    var cO = self._connectionManager.newConnection(src, false, true)
    if (cO.conLimReached) {
      var toDel = self._connectionManager.deleteOneCon()
      if (!self._usingSs) self._delItemInViews(toDel)
    }
    self._initConnectionEvents(cO.connection)
    self._connectionManager.set(cO.connection)
    cO.connection._peer.signal(payload)
  })
  this._sigSer.on('answer', function (src, payload) {
    var cA = self._connectionManager.get(src)
    if (cA) cA._peer.signal(payload)
    else debug('SDP.sigSer.answer received without having one connection with: ' + src)
  })
  this._sigSer.on('candidate', function (src, payload) {
    var cC = self._connectionManager.get(src)
    if (cC) cC._peer.signal(payload)
    else debug('SDP.sigSer.candidate received without having one connection with: ' + src)
  })
  this._sigSer.on('abort', function () { debug('Abort.sigSer was called') })
}
/**
 * @method _bootGossipCycle
 * @description
 * @param
 */
Coordinator.prototype._bootGossipCycle = function (algoId, worker, period) {
  this._algosPool[algoId] = setInterval(function () {
    worker.postMessage({header: 'gossipLoop'})
  }, period)
}
/**
 * @method _initConnectionEvents
 * @description
 * @param
 */
Coordinator.prototype._initConnectionEvents = function (c) {
  if (!c) return
  var self = this
  c.on('open', function () {
    if (Object.keys(self._routingTable).indexOf(c._receiver, 0) !== -1) delete self._routingTable[c._receiver]
  })
  c.on('sdp', function (sdp) {
    if (c._usingSigSer) {
      debug('Sending SDP through the server')
      self._sigSer.sendSDP(sdp, c._receiver)
    } else {
      debug('Sending SDP via DataConnections')
      var proxy = self._routingTable[c._receiver]
      var proxyCon = self._connectionManager.get(proxy)
      if (proxyCon) {
        var type = typeof sdp.type !== 'undefined' ? sdp.type.toUpperCase() : 'CANDIDATE'
        proxyCon.send({
          service: 'SDP',
          emitter: self._id,
          receiver: c._receiver,
          payload: { 'type': type, 'payload': sdp}
        })
      } else debug('No proxy, why?')// TODO What to do if proxy is absent ?
    }
  })
  c.on('msgReception', function (msg) { self.handleIncomingData(msg, c._receiver) })
  c.on('abort', function() {
    self._delItemInViews(c._receiver)
    c.close()
  })
}
/**
* @memberof Coordinator
* @method setWorkerEvents
* @description This method sets the event "message" of a web worker for handling any message exchange
* in WebGC. These are the possible message exchanges: i) from the Coordinator to an external peer, ii)
* from one worker to another one via the Coordinator and iii) from the Coordinator to a web application
* @param worker Reference to a [web worker]{@link http://www.w3schools.com/html/html5_webworkers.asp}*/
Coordinator.prototype.setWorkerEvents = function (worker, algoId) {
  debug('Setting events of worker ' + algoId)
  var self = this
  worker.addEventListener('message', function (e) {
    var msg = e.data
    var worker
    switch (msg.header) {
      case 'outgoingMsg':
        debug('OutgoingMsg to reach: ' + msg.receiver)
        if (msg.header) {
          delete msg.header
          var c = self._connectionManager.get(msg.receiver)
          if (!c) {
            debug('Connection with: ' + msg.receiver + ' does not exist, doing connection')
            c = self._connectionManager.newConnection(msg.receiver, true, self._usingSs)
            if (c.conLimReached) {
              var toDel = self._connectionManager.deleteOneCon()
              if (!self._usingSs) {
                self._delItemInViews(toDel)
                delete self._routingTable[toDel]
              }
            }
            self._initConnectionEvents(c.connection)
            self._connectionManager.set(c.connection)
            c.connection.send(msg)
          } else { c.send(msg) }
        } else { debug('Receiver is null. Msg: ' + JSON.stringify(msg)) }
        break
      case 'getDep':
        worker = self.workers[msg.depId]
        if (worker !== 'undefined') worker.postMessage(msg)
        else debug('there is not a worker for algorithm: ' + msg.depId)
        break
      case 'setDep':
        worker = self.workers[msg.emitter]
        if (worker !== 'undefined') {
          msg.header = 'applyDep'
          worker.postMessage(msg)
        } else debug('there is not a worker for algorithm: ' + msg.emitter)
        break
      // TODO this method must be implemented out of the Coordinator cause the draw of
      // each gossip protocol must be performed by the Plotter obj; to do that, the
      // main thread must ask the view of each protocol in a periodic way
      // case 'drawGraph':
      //   if (typeof self.plotterObj !== 'undefined') {
      //     self.plotterObj.buildGraph(msg.algoId, msg.graph, msg.view)
      //   } else debug(msg)
      //   break
      case 'actCycLog':
        if (self.actCycHistory)
          self.actCycHistory[msg.algoId][msg.counter] = { algoId: msg.algoId, loop: msg.loop, offset: msg.offset }
        break
      case 'viewUpdsLog':
        if (self.statsOpts.activated) self.vieUpdHistory[msg.trace.algoId][msg.counter] = msg.trace
        break
      case 'logInConsole':
        debug(msg.log)
        break
      case 'neigs':
        debug('Neighbourhood of thread ' + msg.algoId + ': ' + msg.view)
        self.emit('neighbourhood', msg.view, msg.algoId, msg.loop)
        break
      default:
        debug('message: ' + msg.header + ' is not recoginized')
        break
    }
  }, false)
  worker.addEventListener('error', function (e) {
    debug('In Worker:' + e.message + ', lineno:' + e.lineno)
    debug(JSON.stringify(e))
  }, false)
}
/**
* @memberof Coordinator
* @method getViewUpdHistory
* @description Get statistics about to which extend the view of algorithms is updated
* @return Object Keys in this object correspond to the number of each gossip cycle*/
Coordinator.prototype.getViewUpdHistory = function () { return this.vieUpdHistory }
/**
* @memberof Coordinator
* @method getActiCycHistory
* @description Get statistics about to which extend the gossip cycle is updated on
* each algorithm
* @return Object Keys in this object correspond to the number each gossip cycle*/
Coordinator.prototype.getActiCycHistory = function () { return this.actCycHistory }
/**
* @memberof Coordinator
* @method emptyHistoryOfLogs
* @description Once this method is called every key of the objects "vieUpdHistory" and "actCycHistory"
* points to an empty object*/
Coordinator.prototype.emptyHistoryOfLogs = function () {
  var i
  var keys = Object.keys(this.vieUpdHistory)
  for (i = 0; i < keys.length; i++) {
    delete this.vieUpdHistory[ keys[i] ]
    this.vieUpdHistory[ keys[i] ] = {}
  }
  keys = Object.keys(this.actCycHistory)
  for (i = 0; i < keys.length; i++) {
    delete this.actCycHistory[ keys[i] ]
    this.actCycHistory[ keys[i] ] = {}
  }
}
/**
* @memberof Coordinator
* @method handleIncomingData
* @description Every message received by peers contains one header to differentiate its payload,
* this method handles the reception of messages according to the next two headers: gossip and
* lookup. The latter serves to discover peers in the overlay and the former contains what it is
* exchanged by each gossip protocol (normally, the view of each peer).
* @param data Message exchange between two peers*/
Coordinator.prototype.handleIncomingData = function (data, emitter) {
  debug('Msg reception in DataChannel: ' + data.service)
  switch (data.service) {
    case 'SDP':
      if (data.receiver === this._id) {
        this._routingTable[data.emitter] = emitter
        switch (data.payload.type) {
          case 'OFFER':
            var cO = this._connectionManager.newConnection(data.emitter, false, this._usingSs)
            if (cO.conLimReached) {
              var toDel = this._connectionManager.deleteOneCon()
              if (!this._usingSs) {
                this._delItemInViews(toDel)
                delete this._routingTable[toDel]
              }
            }
            this._initConnectionEvents(cO.connection)
            this._connectionManager.set(cO.connection)
            cO.connection._peer.signal(data.payload.payload)
            break
          case 'ANSWER':
            var cA = this._connectionManager.get(data.emitter)
            if (cA) cA._peer.signal(data.payload.payload)
            else debug('DataChannel.SDP.answ received without having a connection with: ' + data.emitter)
            break
          case 'CANDIDATE':
            var cC = this._connectionManager.get(data.emitter)
            if (cC) cC._peer.signal(data.payload.payload)
            else debug('DataChannel.SDP.candi received without having a connection with: ' + data.emitter)
            break
          default:
            debug('SDP in DataChannel unknown: ' + data.service)
            break
        }
      } else {
        var c = this._connectionManager.get(data.receiver)
        if (c) {
          debug('Forward msg to reach: ' + data.receiver)
          c.send(data)
        } else {
          // TODO cope with the LEAVE message in SDP
        }
      }
      break
    case 'GOSSIP-PUSH':
      var incomingLog = 'INCOMING MSG: ' + data.algoId + '_' + emitter + '_' + data.receiver + '_' +
        JSON.stringify(data.payload)
      debug(incomingLog)
      this._updRoutingTable(Object.keys(data.payload), emitter)
      var worker = this.workers[data.algoId]
      var msg = {
        header: 'gossipPushRec',
        payload: data.payload,
        receptionTime: new Date(),
        'emitter': emitter
      }
      worker.postMessage(msg)
      break
    case 'GOSSIP-PULL':
      var wo = this.workers[data.algoId]
      var ms = {
        header: 'gossipPullRec',
        payload: data.payload,
        'emitter': emitter
      }
      wo.postMessage(ms)
      break
    case 'LEAVE':
      this._connectionManager.deleteConnection(emitter)
      if (!this._usingSs) {
        this._delItemInViews(emitter)
        delete this._routingTable[emitter]
      }
      break
    case 'APPLICATION':
      this.emit('msgReception', data.emitter, data.payload)
      break
    default:
      debug(data + ' is not recognized')
      break
  }
}
/**
 * @method _updRoutingTable
 * @description
 * @param
 */
Coordinator.prototype._updRoutingTable = function (view, emitter) {
  for (var i = 0; i < view.length; i++) {
    if (view[i] !== emitter) this._routingTable[view[i]] = emitter
  }
}
/**
 * @method updateProfile
 * @description
 * @param
 */
Coordinator.prototype.updateProfile = function (newProfile) {
  for (var i = 0; i < this.algosNames.length; i ++) {
    this.workers[this.algosNames[i]].postMessage({ header: 'updateProfile', profile: newProfile })
  }
}
