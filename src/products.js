const { log, saveBills } = require('cozy-konnector-libs')
const { rootUrl, request } = require('./request')
const cozyhelpers = require('./cozyhelpers')

const tableUrl = rootUrl + '/webapp/wcs/stores/controller/ec/products/table'
const billPath = '/webapp/wcs/stores/controller/OrderBillDisplay'
const firstPageNum = 1

module.exports = {
  fetchBills
}

function fetchBills(folderPath) {
  return fetchPagesCount()
    .then(fetchPages)
    .then(products => fetchBillFiles(products, folderPath))
}

function fetchPagesCount() {
  return requestTable(firstPageNum).then(parsePagesCount)
}

function parsePagesCount($) {
  const lastPageString = $('a[data-page]')
    .last()
    .data('page')

  return lastPageString ? parseInt(lastPageString) : firstPageNum
}

function fetchPages(pagesCount) {
  log('info', `Found ${pagesCount} product page(s).`)

  let productsPromise = Promise.resolve([])

  for (let pageNum = firstPageNum; pageNum <= pagesCount; pageNum++) {
    productsPromise = productsPromise.then(products =>
      fetchPage(pageNum).then(foundProducts => products.concat(foundProducts))
    )
  }

  return productsPromise
}

function fetchPage(pageNum) {
  return requestTable(pageNum).then($ => parseTable(pageNum, $))
}

function requestTable(pageNum) {
  return request({
    method: 'GET',
    url: tableUrl,
    qs: {
      filtre: '0',
      pagination: pageNum.toString()
      // Third parameter `time` is a timestamp probably matching the current
      // date according to the configured timezone of the server, e.g.
      // `+new Date()`. We ignore it since it works without it anyway.
    }
  })
}

function parseTable(pageNum, $) {
  log('info', `Parsing products page ${pageNum}...`)

  const products = $('.item_product')
    .map((_, elem) => parseRow($(elem)))
    .get()

  return products
}

function parseRow($elem) {
  // Most information is available as `data-*` attributes
  const product = $elem.data()

  // Product description is a link to the product page
  product.description = $elem.find('a[href^="/nav/codic/"]').text()

  // Products with a *Download bill* button will have `billPath` set.
  // Products without a *Download bill* button will have `billPath` undefined.
  product.billPath = $elem.find('a[data-tracking="bill-product"]').attr('href')

  return product
}

function fetchBillFiles(products, folderPath) {
  products = keepWhenBillAvailable(products)
  log('info', `Downloading ${products.length} bill(s)...`)
  return cozyhelpers.mkdirp(folderPath).then(() => {
    const billEntries = products.map(billEntry)
    return saveBills(billEntries, folderPath, {
      identifiers: ['darty']
    })
  })
}

function keepWhenBillAvailable(products) {
  // When `billPath` is `undefined`, `"#"` or `"/achat/contacts/index.html"`,
  // bill is either unavailable or can only be sent by email.
  return products.filter(p => p.billPath && p.billPath.startsWith(billPath))
}

function billEntry(product) {
  const isoDateString = frToIsoDate(product.omnitureDate)

  return {
    amount: validAmount(product.omniturePrix),
    date: new Date(isoDateString),
    // Prefix filename with ISO-like date to get sensible default order.
    // Also include product description to help user identify its bills.
    filename: `${isoDateString} – ${product.description}.pdf`,
    fileurl: rootUrl + product.billPath,
    vendor: 'Darty'
  }
}

function validAmount(productPrice) {
  switch (typeof productPrice) {
    case 'number':
      return productPrice // Data attribute was already automatically converted
    case 'string':
      // Ignore any non-number char (including broken thousands separator).
      // And replace comma with dot as decimal separator.
      return parseFloat(productPrice.replace(/[^0-9,]/g, '').replace(/,/, '.'))
    default:
      log('warn', `Cannot parse product price: ${productPrice}`)
  }
}

function frToIsoDate(frDateString) {
  return frDateString
    .match(/(\d{2})\/(\d{2})\/(\d{4})/)
    .slice(1, 4)
    .reverse()
    .join('-')
}
