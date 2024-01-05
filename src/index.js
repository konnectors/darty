const { CookieKonnector, log } = require('cozy-konnector-libs')
const { authenticate } = require('./auth')
const products = require('./products')

class DartyConnector extends CookieKonnector {
  async testSession() {
    if (!this._jar._jar.toJSON().cookies.length) {
      return false
    }
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
  // debug: 'simple',
  cheerio: true,
  json: false,
  headers: {
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'User-Agent':
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:74.0) Gecko/20100101 Firefox/74.0'
  }
})

connector.run()
