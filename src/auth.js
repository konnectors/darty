const { log, errors } = require('cozy-konnector-libs')
const { rootUrl, request } = require('./request')

const loginUrl = rootUrl + '/espace_client/connexion'

module.exports = {
  authenticate
}

// Darty temporarily disables an account after 5 login failures.
function authenticate(login, password) {
  log('info', 'Authenticating...')

  return request({
    method: 'POST',
    uri: loginUrl,
    form: {
      email: login,
      password: password
    }
  })
    .then(() => {
      log('info', 'Login successful.')
    })
    .catch(err => {
      if (err.statusCode === 401) throw new Error(errors.LOGIN_FAILED)
      else throw err
    })
}
