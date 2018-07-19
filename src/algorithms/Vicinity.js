/**
* @module src/algorithms 
* @author Raziel Carvajal-Gomez raziel.carvajal@gmail.com */
module.exports = Vicinity
var inherits = require('inherits')
var GossipProtocol = require('../superObjs/GossipProtocol')
var ViewSelector = require('../superObjs/ViewSelector')
inherits(Vicinity, GossipProtocol)
/**
* @class Vicinity
* @extends GossipProtocol See [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* @description Implementation of the gossip-based protocol
* [Vicinity]{@link http://www.few.vu.nl/~spyros/papers/Thesis-Voulgaris.pdf} to form clusters
* of peers with similar profiles. The similarity of peers is obtained through one function
* that computes to which extent two peers' profiles are similar form each other. This similarity
* function is set by the user in the configuration object, see 
* [configurationObject]{@link module:../utils/ConfigurationObject.js}.
* @param algOpts Settings of the protocol
* @param debug Log the behavior of the protocol
* @param gossipUtil Common functions used by the protocols, see
* [GossilUtil]{@link module:src/utils#GossipUtil}
* @param isLogActivated Boolean to decide weather to send or not statistics about the protocol to
* the main thread
* @param profile Local peer's profile*/
function Vicinity (algOpts, debug, gossipUtil, isLogActivated, profile) {
  if (!(this instanceof Vicinity)) return Vicinity(algOpts, debug, gossipUtil, isLogActivated, profile)
  this.isLogActivated = isLogActivated
  GossipProtocol.call(this, algOpts, debug, gossipUtil, profile)
  this.selectionPolicy = algOpts.selectionPolicy
  this.selector = new ViewSelector(profile, debug, algOpts.similarityFunction)
  this.dependencies = algOpts.dependencies
  debug('Vicinity.init')
}
/**
* @memberof Vicinity
* @const defaultOpts
* @description Default values for the gossip attributes. During its instantiation, via the 
* [GossipFactory]{@link module:src/services/GossipFactory} object, if the user doesn't specify
* any attribute the algorithm will be initialized with the values in this object.
* @default*/
Vicinity.defaultOpts = {
  class: 'Vicinity',
  viewSize: 10,
  fanout: 5,
  periodTimeOut: 10000,
  propagationPolicy: { push: true, pull: true },
  selectionPolicy: 'biased' // random OR biased OR agr-biased
}
/**
* @memberof Vicinity
* @method selectPeer
* @description Select one peer ID from the view with the oldest age. For more details, look for
* this method at the [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Vicinity.prototype.selectPeer = function () { return this.gossipUtil.getOldestKey(this.view) }
/**
* @memberof Vicinity
* @method setMediator
* @description Sets an instance of the [GossipMediator]{@link module:src/controllers/GossipMediator} object
* to comunicate the main thread with the gossip protocol.*/
Vicinity.prototype.setMediator = function (mediator) {
  mediator.setDependencies(this.dependencies)
  this.gossipMediator = mediator
}
/**
* @memberof Vicinity
* @method initialize
* @description For more details, look for this method at the 
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Vicinity.prototype.initialize = function (keys) {
  if (keys.length > 0) {
    var i = 0
    while (i < this.viewSize && i < keys.length) {
      this.view[keys[i]] = this.gossipUtil.newItem(0, 'undefined')
      i++
    }
  }
}
/**
* @memberof Vicinity
* @method selectItemsToSend
* @description The selection of "this.viewSize" items is performed following one of the next
* cases: i) if selection = random, items from the local peer's view are chosen in a randomly way,
* ii) if selection = biased, the most similar items are chosen from the local peer's view and iii)
* if selection = agr-biased, the most similar items are chosen from the merge of the peer sampling
* view with the local peer's view. For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.
* @param receiver The selection of items will be sent to this peer
* @param gossMsgType Strting to define the type of gossip exchange, there are two possible values:
* i) GOSSIP-PUSH means to send items to an external peer or ii) GOSSIP-PULL to keep items from an
* external peer*/
Vicinity.prototype.selectItemsToSend = function (receiver, gossMsgType) {
  var dstPeer = receiver || this.selectPeer()
  if (!dstPeer) return
  if (receiver) debug(this.algoId + ': SelectItemsToSend, receiver is ' + receiver)
  else debug(this.algoId + ': SelectItemsToSend, receiver is ' + dstPeer + ' (oldest peer in view)')
  var clone = JSON.parse(JSON.stringify(this.view))
  delete clone[dstPeer]
  var subDict, msg
  switch (this.selectionPolicy) {
    case 'random':
      subDict = this.gossipUtil.getRandomSubDict(this.fanout - 1, clone)
      subDict[this.peerId] = this.gossipUtil.newItem(0, this.profile.getPayload())
      msg = {
        service: gossMsgType,
        header: 'outgoingMsg',
        emitter: this.peerId,
        receiver: dstPeer,
        payload: subDict,
        algoId: this.algoId
      }
      this.gossipMediator.postInMainThread(msg)
      break
    case 'biased':
      subDict = this.selector.getClosestNeighbours(this.fanout - 1, clone)
      subDict[this.peerId] = this.gossipUtil.newItem(0, this.profile.getPayload())
      msg = {
        service: gossMsgType,
        header: 'outgoingMsg',
        emitter: this.peerId,
        receiver: dstPeer,
        payload: subDict,
        algoId: this.algoId
      }
      this.gossipMediator.postInMainThread(msg)
      break
    case 'agr-biased':
      msg = {
        header: 'getDep',
        cluView: clone,
        receiver: dstPeer,
        emitter: this.algoId,
        callback: 'doAgrBiasedSelection',
        gossMsg: gossMsgType
      }
      for (var i = 0; i < this.dependencies.length; i++) {
        msg.depId = this.dependencies[i].algoId
        msg.depAtt = this.dependencies[i].algoAttribute
        this.gossipMediator.applyDependency(msg)
      }
      break
    default:
      this.debug('Unknown peer selection policy')
      break
  }
}
/**
* @memberof Vicinity
* @method doAgrBiasedSelection
* @description When this selection is performed, items from the RPS layer are mixed with the
* most similar ones (similar items are obtained via the similarity function) in order to get
* the new view of the local peer. Once the merge is finished, the result view is sent to an
* external peer.
* @param msg This object contains a list of items from the RPS layer and the receiver of the
* merged view.*/
Vicinity.prototype.doAgrBiasedSelection = function (msg) {
  var keys = Object.keys(msg.result)
  var result = {}
  var itm
  for (var i = 0; i < keys.length; i++) {
    itm = msg.result[ keys[i] ]
    result[ keys[i] ] = this.gossipUtil.newItem(itm.age, itm.data)
  }
  var mergedViews = this.gossipUtil.mergeViews(msg.cluView, result)
  delete mergedViews[ this.peerId ]
  var similarNeig = this.selector.getClosestNeighbours(this.fanout -1, mergedViews)
  similarNeig[ this.peerId ] = this.gossipUtil.newItem(0, this.profile.getPayload())
  var payload = {
    service: msg.gossMsg,
    header: 'outgoingMsg',
    emitter: this.peerId,
    receiver: msg.receiver,
    'payload': similarNeig,
    algoId: this.algoId
  }
  this.gossipMediator.postInMainThread(payload)
  // this.gossipMediator.sentActiveCycleStats()
}
/**
* @memberof Vicinity
* @method selectItemsToKeep
* @description For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class
* @param msg Items from an external peer.*/
Vicinity.prototype.selectItemsToKeep = function (msg) {
  var mergedViews = this.gossipUtil.mergeViews(this.view, msg.payload)
  var msg1 = {
    header: 'getDep',
    cluView: mergedViews,
    emitter: this.algoId,
    callback: 'doItemsToKeepWithDep',
    receptionTime: msg.receptionTime
  }
  for (var i = 0; i < this.dependencies.length; i++) {
    msg1.depId = this.dependencies[i].algoId
    msg1.depAtt = this.dependencies[i].algoAttribute
    this.gossipMediator.applyDependency(msg1)
  }
}
/**
* @memberof Vicinity
* @method doItemsToKeepWithDep
* @description When this selection is performed, items from the RPS layer are mixed with the
* most similar ones (this items are obtained via the similarity function) in order to get
* the new view of the local peer. Once the merge is finished, the view Vicinity.view is
* updated with the merged view.
* @param msg This object contains a list of items from the RPS layer */
Vicinity.prototype.doItemsToKeepWithDep = function (msg) {
  var keys = Object.keys(msg.result)
  var result = {}
  var i, itm
  for (i = 0; i < keys.length; i++) {
    itm = msg.result[ keys[i] ]
    result[ keys[i] ] = this.gossipUtil.newItem(itm.age, itm.data)
  }
  var mergedViews = this.gossipUtil.mergeViews(msg.cluView, result)
  if (Object.keys(mergedViews).indexOf(this.peerId, 0) !== -1) delete mergedViews[this.peerId]
  this.view = this.selector.getClosestNeighbours(this.viewSize, mergedViews)
}
/**
* @memberof Vicinity
* @method increaseAge
* @description For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Vicinity.prototype.increaseAge = function () {
  var keys = Object.keys(this.view)
  for (var i = 0; i < keys.length; i++) this.view[ keys[i] ].age++
}
