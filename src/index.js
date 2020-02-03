process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://89d41b28d3844f1bb53fa010ea78503c:75dc52afdcca41aca4e1351c80affc6c@sentry.cozycloud.cc/33'

const { BaseKonnector } = require('cozy-konnector-libs')
const { authenticate } = require('./auth')
const helpers = require('./helpers')
const products = require('./products')

module.exports = new BaseKonnector(start)

async function start(fields) {
  try {
    await authenticate(fields.login, fields.password)
    await products.fetchBills(fields, this)
  } catch (err) {
    helpers.fixErrors(err)
  }
}
