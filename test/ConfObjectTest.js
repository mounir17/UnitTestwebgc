
var assert = require('chai').assert;
var stringToNumber = require('../examples/stringToNumber');
var sim = require('../src/utils/ConfigurationObject').gossipAlgos.vicinity1.similarityFunction;


/* the folowing test concerns the main method
* in the module 'src/confObjs':
* Similarity should return a number < = 1
*/

describe('Similarity', function(){
    var hello = "hello";
    var wor = "wor";
    var coord = function(hello, wor){
        var num = sim(a,b);
        return num
    }
    // Example "Math.floor(0.5)=0"
    var cero = Math.floor(coord);
    it('Should be equal to 0', function(){
        assert.equal(cero, 0);
        
    });
    it('StringToNumber should convert<hello> to <532>', function(){
        var hello = "hello";
        assert.equal(stringToNumber(hello),'532');
    });
});
