/*module.exports = function(){
    return "Hola mundo";
}*/
module.exports =  function(s) {
    var num = 0
    for (var i = 0; i < s.length; i++) num += s.charCodeAt(i)
    return num
  }

  