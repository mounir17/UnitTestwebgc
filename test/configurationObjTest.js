var assert = require('chai').assert;
var stringToNumber = require('../examples/stringToNumber');
var sim = require('../src/utils/ConfigurationObject').gossipAlgos.vicinity1.similarityFunction;
/* the folowing test concerns the main function in the module 'src/confObjs'*/

describe('StringToNumber', function(){
    var hello = "hello";

    it('StringToNumber should convert aqui<hello> to <532>', function(){
        var hello = "hello";
        assert.equal(stringToNumber(hello),'532');
    });
});

describe('Similarity',function(){
    var hello = "hello";
    var world = "wor";
    it('', function(){
        throws(coordinator(hello,world), "Parameter should be an object", "Exception thrown if result is >1");
        //assert.equal(coordinator(hello,world),'');
    });
});

/**
 * the folowing test concerns
 */
//var coord = require('../src/controllers/Coordinator');

/*describe('Coordinator', function(){

    it('Coordinator well instanciate !', function(){

    });
});*/
