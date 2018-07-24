
var assert = require('chai').assert;
var stringToNumber = require('../examples/stringToNumber');
var sim = require('../src/utils/ConfigurationObject').gossipAlgos.vicinity1.similarityFunction;
/* the folowing test concerns the main function in the module 'src/confObjs'*/

describe('StringToNumber', function(){
    var hello = "hello";

    it('StringToNumber should convert AHI<hello> to <532>', function(){
        var hello = "hello";
        assert.equal(stringToNumber(hello),'532');
    });
});
