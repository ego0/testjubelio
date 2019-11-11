'use strict'
const Hapi = require('@hapi/hapi')
const axios = require('axios')
const xmlParser = require('xml2json')
const db = require('./config/db')
const product = require('./models/product')

db.authenticate()
    .then(() => console.log('Database connected ...'))
    .catch(err => console.log('Error:' + err))

const createProduct = async (val) => {
    try {
        const [prod, created] = await product.findOrCreate({where: {sku: val.prdNo}, defaults: {
            sku: val.prdNo,
            name: val.prdNm,
            image: '',
            description: val.dispCtgrNm,
            price: val.selPrc
        }})
        return prod.dataValues
    } catch (err) {
        throw err
    }
}
const getProducts= async (request) => {
    var args = request.query;
    let page = 1
    if (args.page) {
        page = 1
    }
    // set up headers
    var config = {
        headers: {
            "Content-type": "application/xml",
            "Accept-Charset": "utf-8",
            "openapikey": "721407f393e84a28593374cc2b347a98",
        }
    }
    try {
        // get elevenia products
        const result = await axios.get('http://api.elevenia.co.id/rest/prodservices/product/listing?page='+page, config)
        // return xml2json
        let to_json = JSON.parse(xmlParser.toJson(result.data))
        for (let prod of to_json.Products.product) {
            // findOrCreate product filter by page number
            await createProduct(prod)
        }
        return product.findAll({limit: 24, offset:page, order: [['id', 'ASC']]})
   } catch(err) {
       console.log("Failed get data \n" + err)
       return err
   }
}
const removeProduct = async (id) => {
    try {
        const res =  await product.destroy({ where: {id: id}})
        return res
    } catch(err) {
        return err
    }
}
const updateProduct = async (request) => {
    try {
        const res = await product.update(request.payload, {where: {id: request.params.id}})
        return res
    } catch (err) {
        return err
    }
}
// init server
const init = async () => {
    // add server
    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    })
    // route get product and create to local database
    server.route({
        method: 'GET',
        path: '/api/products',
        config: {
            cors : true,
        },
        handler: async (request, h) => {
           const res = await getProducts(request)
           return res
        }
    });
    // remove product on local database
    server.route({
        method: 'GET',
        path: '/api/products/{id}',
        config: {
            cors: true
        },
        handler: async (request, h) => {
            const res = await removeProduct(request.params.id)
            return res
         }

    })
    // update product to localdatabase
    server.route({
        method: 'POST',
        path: '/api/products/{id}/update',
        config: {
            cors: true
        },
        handler: async (request, h) => {
            const res = await updateProduct(request)
            return res
         }

    })
    // start server
    await server.start();
    console.log('Server started at: %s', server.info.uri)
}
init()
