const { requestFactory } = require('cozy-konnector-libs')

const rootUrl = 'https://www.darty.com'

const request = requestFactory({
  // debug: true,
  cheerio: true,
  jar: true,
  json: false,
  headers: {
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3'
  }
})

module.exports = {
  rootUrl,
  request
}
