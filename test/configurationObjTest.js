var assert = require('chai').assert;
var stringToNumber = require('../examples/stringToNumber');
<<<<<<< HEAD
var sim = require('../src/utils/ConfigurationObject').gossipAlgos.vicinity1.similarityFunction;
/* the folowing test concerns the main function in the module 'src/confObjs'*/
=======

/* the folowing test concerns the main function of the module 'src/confObjs'*/
>>>>>>> 66261c5c15acbdfc510c61c28f5ce6c155a92d26

describe('StringToNumber', function(){
    var hello = "hello";

    it('StringToNumber should convert<hello> to <532>', function(){
        var hello = "hello";
        assert.equal(stringToNumber(hello),'532');
    });
<<<<<<< HEAD
});

/**
 * the folowing test concerns
 */
var coord = require('../src/controllers/Coordinator');

/*describe('Coordinator', function(){

    it('Coordinator well instanciate !', function(){

    });
});*/
=======
});
>>>>>>> 66261c5c15acbdfc510c61c28f5ce6c155a92d26
