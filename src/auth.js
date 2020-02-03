const { log, errors } = require('cozy-konnector-libs')
const { rootUrl, request } = require('./request')
const sleep = require('util').promisify(global.setTimeout)

const loginUrl = rootUrl + '/espace_client/connexion'

module.exports = {
  authenticate
}

// Darty temporarily disables an account after 5 login failures.
async function authenticate(login, password) {
  log('info', 'Authenticating...')
  try {
    await request.get('https://www.darty.com/espace_client/connexion')
    await sleep(3000)
    await request.post({
      uri: loginUrl,
      form: {
        email: login,
        password: password
      },
      headers: {
        referer: 'https://www.darty.com/espace_client/connexion',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache'
      }
    })

    log('info', 'Successfully logged in')
  } catch (err) {
    if (err.statusCode === 401) throw new Error(errors.LOGIN_FAILED)
    else throw err
  }
}
