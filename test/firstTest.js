var assert = require('chai').assert;
var first = require('../examples/first');

describe('First',function(){
    it('first should be Hola mundo', function(){
        assert.equal(first(), 'Hola mundo');
    });
});


