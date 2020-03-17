const { log, errors } = require('cozy-konnector-libs')
const { rootUrl } = require('./request')
const sleep = require('util').promisify(global.setTimeout)

const loginUrl = rootUrl + '/espace_client/connexion'

module.exports = {
  authenticate
}

// Darty temporarily disables an account after 5 login failures.
async function authenticate(login, password, self) {
  log('info', 'Authenticating...')
  try {
    await self.request.get('https://www.darty.com/espace_client/connexion', {
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    })
    await sleep(3000)
    await self.request.post({
      uri: loginUrl,
      form: {
        email: login,
        password: password
      },
      headers: {
        referer: 'https://www.darty.com/espace_client/connexion',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    })

    log('info', 'Successfully logged in')
  } catch (err) {
    if (err.statusCode === 401) throw new Error(errors.LOGIN_FAILED)
    else throw err
  }
}
