
var assert = require('chai').assert;
var stringToNumber = require('../examples/stringToNumber');
var sim = require('../examples/Similarity');


/* the following test concerns the main method
* in the module 'src/confObjs':
* Similarity should return a number < = 1
*/

describe('Similarity', function(){
    var hello = "hello";
    var wor = "wor";
    var num = sim(hello,wor);
    var coord = function(hello, wor){
       
        console.log('le nombre est : ', );
        return num
    }
    var cero = Math.floor(num);
    
       
    it('Should be equal to 0', function(){
        assert.equal(cero, 0);
        
    });
    it('StringToNumber should convert<hello> to <532>', function(){
        var hello = "hello";
        assert.equal(stringToNumber(hello),'532');
    });
});
