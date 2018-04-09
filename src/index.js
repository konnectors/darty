const { BaseKonnector } = require('cozy-konnector-libs')
const { authenticate } = require('./auth')
const products = require('./products')

module.exports = new BaseKonnector(start)

function start(fields) {
  return authenticate(fields.login, fields.password).then(() =>
    products.fetchBills(fields.folderPath)
  )
}
