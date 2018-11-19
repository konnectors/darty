const { log, saveBills } = require('cozy-konnector-libs')
const { rootUrl, request } = require('./request')
const helpers = require('./helpers')
// const sleep = require('util').promisify(global.setTimeout)

const tableUrl = rootUrl + '/webapp/wcs/stores/controller/ec/products/table'
// const generateBillUrl =
//   rootUrl + '/webapp/wcs/stores/controller/FactureMagasinGeneration'
const billPath = '/webapp/wcs/stores/controller/'

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

async function requestTable(pageNum) {
  const options = {
    url: tableUrl,
    qs: {
      filtre: '0',
      pagination: pageNum.toString()
    }
  }
  const $ = await request(options)

  return $

  // const toGenerate = $('.download-bills-desktop a[data-token]')
  // if (toGenerate.length) {
  //   log('info', `${toGenerate.length} bills to generate`)
  //   for (const bill of Array.from(toGenerate)) {
  //     await generateBill(bill, $)
  //     break
  //   }
  //   return request(options)
  // } else return $
}

// async function generateBill(bill, $) {
//   const data = $(bill).data()
//   const options = {
//     url: generateBillUrl,
//     qs: {
//       numCmd: data.num,
//       placeOrderTime: data.time,
//       token: data.token
//     }
//   }
//   for (let i = 0; i <= 5; i++) {
//     await request.post(options)
//     await sleep(1000)
//   }
//   log('info', `Bill ${data.num} generation done`)
// }

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

  if (product.billPath === '#') {
    log('warn', 'User action needed, a pdf bill needs to be generated')
  }

  return product
}

function fetchBillFiles(products, folderPath) {
  products = keepWhenBillAvailable(products)
  log('info', `Downloading ${products.length} bill(s)...`)
  return helpers.mkdirp(folderPath).then(() => {
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
  const { date, isoDateString } = helpers.parseFrenchDate(product.omnitureDate)

  return {
    amount: helpers.parseAmount(product.omniturePrix),
    date,
    // Prefix filename with ISO-like date to get sensible default order.
    // Also include product description to help user identify its bills.
    filename: helpers.normalizeFilename(
      `${isoDateString}-${product.description}.pdf`
    ),
    fileurl: rootUrl + product.billPath,
    vendor: 'Darty'
  }
}
