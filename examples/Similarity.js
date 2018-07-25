module.exports = function (a, b) {
    function stringToNumber (s) {
      var num = 0
      for (var i = 0; i < s.length; i++) num += s.charCodeAt(i)
      return num
    }
    var maxLength = Math.max(a.length, b.length)
    var a1 = []
    var b1 = []
    var sumAsqr = 0
    var sumBsqr = 0
    var sumProd = 0
    for (var i = 0; i < maxLength; i++) {
      if (i < a.length && i < b.length) {
        a1[i] = stringToNumber(a[i])
        b1[i] = stringToNumber(b[i])
      } else if (i < a.length){
        a1[i] = stringToNumber(a[i])
        b1[i] = 1
      } else {
        a1[i] = 1
        b1[i] = stringToNumber(b[i])
      }
      sumAsqr += a1[i] * a1[i]
      sumBsqr += b1[i] * b1[i]
      sumProd += a1[i] * b1[i]
    
    }
    if (sumAsqr === 0 || sumBsqr === 0) return sumProd  
    return sumProd / (Math.sqrt(sumAsqr) * Math.sqrt(sumBsqr))
  }