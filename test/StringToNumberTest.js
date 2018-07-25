var assert = require('chai').assert;
var stringToNumber = require('../examples/stringToNumber');

/* the folowing test concerns the function StringToNumber*/

describe('StringToNumber', function(){
    var hello = "hello";

    it('StringToNumber should convert aqui<hello> to <532>', function(){
        var hello = "hello";
        assert.equal(stringToNumber(hello),'532');
    });
});

