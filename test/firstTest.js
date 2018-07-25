var assert = require('chai').assert;
var first = require('../examples/first');

describe('First',function(){
    it('first should be Hola mundo', function(){
        assert.equal(first(), 'Hola mundo');
    });
});



//-----------------------------

// GossipFactory.prototype._buildWorkerHeader = function (algoId, algoClass, statsActiv, algOpts) {
//     var file, i
//     var code = 'var isLogActivated = ' + statsActiv + '\n'
//     if (inNodeJS) code += "var debug = console.log\ndebug('Worker initialization')\n"
//     else code += "var debug = function (msg) {}\ndebug('Worker initialization')\n"
//     var libs = Object.keys(this._workerLibs)
//     for (i = 0; i < libs.length; i++) {
//       code += "importScripts('" + this._workerLibs[ libs[i] ] + "')\n"
//       code += "debug('import of " + libs[i] + " is DONE')\n"
//     }
//     if (libs.indexOf(algoClass, 0) !== -1) debug('File to import exists')
//     else throw new Error('Worker library ' + algoClass + ' do not exists')
//     code += "importScripts('" + this._workerLibs[algoClass] + "')\n"
//     var keysWithFunc = this.searchFunctions(algOpts)
//     if (keysWithFunc.length > 0) {
//       for (i = 0; i < keysWithFunc.length; i++) algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ])
//     }
//     code += 'var algOpts = ' + JSON.stringify(algOpts) + '\n'
//     for (i = 0; i < keysWithFunc.length; i++) {
//       code += "algOpts['" + keysWithFunc[i] + "'] = " + algOpts[ keysWithFunc[i]] + '\n'
//     }
//     code += "debug('Worker initialization BEGINS')\n"
//     code += 'var gossipUtil = new GossipUtil(debug)\n'
//     code += 'var payload = ' + JSON.stringify(this._profile) + '\n'
//     code += 'var profile = new Profile(payload)\n'
//     code += 'var algo = new ' + algoClass + '(algOpts, debug, gossipUtil, isLogActivated, profile)\n'
//     code += 'var mediator = new GossipMediator(algo, this, debug)\n'
//     code += 'algo.setMediator(mediator)\n'
//     code += 'mediator.listen()\n'
//     code += "debug('Worker initialization DONE')"
//     return code
//   }

// --------------------------------

  
