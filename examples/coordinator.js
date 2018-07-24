/*module.exports = function(){
    return "Hola mundo";
}*/
var sim = require('../src/utils/ConfigurationObject').gossipAlgos.vicinity1.similarityFunction;

module.exports =  function(a, b) {
    var num = sim(a,b);
    if (num >= 1) {
        throw "Parameter should be an less than 1"
    }
    return num
  }
