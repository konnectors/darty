const { BaseKonnector } = require('cozy-konnector-libs')
const { authenticate } = require('./auth')

module.exports = new BaseKonnector(start)

function start(fields) {
  return authenticate(fields.login, fields.password)
}
