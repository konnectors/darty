const { log, cozyClient } = require('cozy-konnector-libs')
const { rootUrl } = require('./request')
const helpers = require('./helpers')
const sleep = require('util').promisify(global.setTimeout)

const tableUrl = rootUrl + '/webapp/wcs/stores/controller/ec/products/table'
const generateBillUrl =
  rootUrl + '/webapp/wcs/stores/controller/FactureMagasinGeneration'
const billPath = '/webapp/wcs/stores/controller/'

const firstPageNum = 1

module.exports = {
  fetchBills
}

function fetchBills(fields, self) {
  return fetchPagesCount(self)
    .then(count => fetchPages(count, fields.folderPath, self))
    .then(products => fetchBillFiles(products, fields, self))
}

function fetchPagesCount(self) {
  return requestTable(firstPageNum, self).then(parsePagesCount)
}

function parsePagesCount($) {
  const lastPageString = $('a[data-page]').last().data('page')

  return lastPageString ? parseInt(lastPageString) : firstPageNum
}

async function fetchPages(pagesCount, folderPath, self) {
  log('info', `Found ${pagesCount} product page(s).`)

  let products = []
  for (let pageNum = firstPageNum; pageNum <= pagesCount; pageNum++) {
    const foundProducts = await fetchPageAndGenerateBillsIfNeeded(
      pageNum,
      folderPath,
      self
    )
    products = products.concat(foundProducts)
  }

  return products
}

async function filterNonExistingProductsInCozy(products, folderPath) {
  let result = []
  for (let product of products) {
    const bill = billEntry(product)

    try {
      await cozyClient.files.statByPath(folderPath + '/' + bill.filename)
    } catch (err) {
      result.push(product)
    }
  }
  return result
}

async function fetchPageAndGenerateBillsIfNeeded(pageNum, folderPath, self) {
  let products = await fetchPage(pageNum, self)
  let productsToGenerate = products.filter(p => p.generateData)
  const newProducts = await filterNonExistingProductsInCozy(
    productsToGenerate,
    folderPath
  )
  log(
    'info',
    `Found ${newProducts.length} products pdf on page ${pageNum} to generate`
  )

  if (newProducts.length) {
    await generateProductsPdfs(newProducts, self)
    await sleep(10000)
    products = await fetchPage(pageNum, self)
    productsToGenerate = products.filter(p => p.generateDate)
    if (productsToGenerate.length) {
      log(
        'warn',
        `Still ${productsToGenerate.length} products pdf on page ${pageNum} to generate...`
      )
    }
  }

  return products
}

async function fetchPage(pageNum, self) {
  return requestTable(pageNum, self).then($ => parseTable(pageNum, $))
}

async function requestTable(pageNum, self) {
  const options = {
    url: tableUrl,
    qs: {
      filtre: '0',
      pagination: pageNum.toString()
    }
  }
  return self.request(options)
}

async function generateProductsPdfs(products, self) {
  for (const product of products) {
    const data = product.generateData
    const options = {
      url: generateBillUrl,
      qs: {
        numCmd: data.num,
        placeOrderTime: data.time,
        token: data.token
      }
    }
    log('info', `Generating pdf for product : ${product.description}`)
    await self.request.post(options)
  }
}

function parseTable(pageNum, $) {
  log('info', `Parsing products page ${pageNum}...`)

  const products = $('.item_product')
    .map((_, elem) => {
      const result = parseRow($(elem))
      result.$ = $
      return result
    })
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

  const aWithToken = $elem.find('a[data-token]')
  if (aWithToken.length) {
    product.generateData = aWithToken.data()
  }

  return product
}

function fetchBillFiles(products, fields, self) {
  products = keepWhenBillAvailable(products)
  log('info', `Downloading ${products.length} bill(s)...`)
  const billEntries = products.map(billEntry)
  return self.saveBills(billEntries, fields, {
    linkBankOperations: false,
    fileIdAttributes: ['vendorRef']
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
    vendorRef: product.omnitureCodic,
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
