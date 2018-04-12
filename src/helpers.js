// Code that could make its way to cozy-konnector-libs

const { basename, dirname } = require('path')
const { log, cozyClient } = require('cozy-konnector-libs')

const forbiddenCharsRegExp = /[<>:"/\\|?*\0\s]+/g

module.exports = {
  fixErrors,
  mkdirp,
  normalizeFilename,
  parseAmount,
  parseFrenchDate
}

// Prevent cheerio-wrapped errors to mess-up logging because of self-references.
function fixErrors(err) {
  if (
    typeof err.response === 'function' &&
    typeof err.response.text === 'function'
  ) {
    throw new Error(err.response.text())
  } else {
    throw err
  }
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

function normalizeFilename(name) {
  return name.replace(forbiddenCharsRegExp, '_')
}

function parseAmount(amount) {
  switch (typeof amount) {
    case 'number':
      return amount // Data attribute was already automatically converted
    case 'string':
      // Ignore any non-number char (including sometimes broken thousands
      // separator). And replace comma with dot as decimal separator.
      return parseFloat(amount.replace(/[^0-9,.]/g, '').replace(/,/, '.'))
    default:
      log('warn', `Invalid amount: ${amount}`)
  }
}

// Returns both:
// - a date object to be used with e.g. `saveBills()`
// - an ISO date string ready to use in filenames
function parseFrenchDate(frDateString) {
  const isoDateString = frDateString
    .match(/(\d{2})\/(\d{2})\/(\d{4})/)
    .slice(1, 4)
    .reverse()
    .join('-')

  return {
    isoDateString,
    date: new Date(isoDateString)
  }
}
