const forbiddenCharsRegExp = /[<>:"/\\|?*\0\s]+/g

module.exports = {
  normalize
}

function normalize(name) {
  return name.replace(forbiddenCharsRegExp, '_')
}
