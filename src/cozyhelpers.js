const { basename, dirname } = require('path')
const { log, cozyClient } = require('cozy-konnector-libs')

module.exports = {
  mkdirp
}

// create a folder if it does not already exist
function mkdirp(path) {
  const folderName = basename(path)
  path = dirname(path)
  return cozyClient.files.statByPath(`${path}/${folderName}`).catch(err => {
    log('info', err.message, `${path} folder does not exist yet, creating it`)
    return cozyClient.files.statByPath(`${path}`).then(parentFolder =>
      cozyClient.files.createDirectory({
        name: folderName,
        dirID: parentFolder._id
      })
    )
  })
}
