process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://89d41b28d3844f1bb53fa010ea78503c:75dc52afdcca41aca4e1351c80affc6c@sentry.cozycloud.cc/33'

const { CookieKonnector, log } = require('cozy-konnector-libs')
const { authenticate } = require('./auth')
const products = require('./products')

class DartyConnector extends CookieKonnector {
  async testSession() {
    log('debug', 'Testing session')
    const resp = await this.request(
      'https://www.darty.com/webapp/wcs/stores/controller/ec/products',
      {
        resolveWithFullResponse: true
      }
    )
    log('debug', resp.request.uri.href)
    const result = resp.request.uri.href.includes(
      'https://www.darty.com/espace_client/connexion'
    )

    log('debug', !result)
    return !result
  }

  async fetch(fields) {
    if (!(await this.testSession())) {
      await authenticate(fields.login, fields.password, this)
    }
    await products.fetchBills(fields, this)
  }
}

const connector = new DartyConnector({
  // debug: true,
  cheerio: true,
  json: false,
  headers: {
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3'
  }
})

connector.run()
