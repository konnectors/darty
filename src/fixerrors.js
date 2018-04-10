// Prevent cheerio-wrapped errors to mess-up logging because of self-references.
// TODO: Fix the issue in cozy-konnector-libs
module.exports = function(err) {
  if (
    typeof err.response === 'function' &&
    typeof err.response.text === 'function'
  ) {
    throw new Error(err.response.text())
  } else {
    throw err
  }
}
