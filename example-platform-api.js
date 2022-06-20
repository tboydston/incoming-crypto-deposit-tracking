const fs = require('fs')
const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
const sigMan = require("./lib/signatureManager")
const pubKey = fs.readFileSync(`./keys/pub.pem`)
const crypto = require('crypto')
const HdAddGen = require('hdaddressgenerator')

const serverPort = 7001
const nonceTolerance = 1000

const validationTypes = ['hash','address']

// Used to generate example responses. 
const allConfigs = require('./config')
const coin = process.argv[2]
const config = allConfigs[coin]
if ( config === undefined ){
    console.log('Coin must be defined. Example: node example-platform.js BTC')
}

// This is expecting a file containing the wallet TX output from the listsinceblock RPC command and is used as example data to test the /validate/deposits route. It is looking for just the "transactions" array from this output. 
// File content example: 'module.exports = [transactions array]
let exampleDeposits = []
try {
    exampleDeposits = require('./test/exampleDeposits.js')
} catch (e) {
    console.log("No example deposit data supplied. Route validate/deposits will not work.",e)
}


;(async()=>{

    const app = express();

    app.use(bodyParser.text({
        type: function(req) {
            return 'text';
        }
     }));

    // Validate signature on all requests. 
    app.use(async (req, res, next) => {

        const sigResult = await sigMan.verify(pubKey,req.body,req.headers.signature) 
        if ( sigResult ) return next() 
        console.log(`Invalid signature.`)
        res.status(403).send({
            status:'fail',
            message: 'Invalid signature.'
        })
        return

    })

    // Validate nonce on all requests. 
    app.use(async (req, res, next) => {


        let now = Date.now()
        let nonce = JSON.parse(req.body).nonce

        if ( nonce === undefined || nonce < now - nonceTolerance ){
            console.log(`Invalid nonce. Sent: ${nonce}, No later then: ${now - nonceTolerance}`)
            res.status(403).send({
                status:'fail',
                message: 'Invalid nonce.'
            })
            return 
        }

        return next()

    })

    // Log incoming request to console.
    app.use(async (req, res, next) => {
        console.log(req.originalUrl,req.body)
        next() 
    })

    // Add addresses. 
    app.post('/addresses', async(req, res) => {
    
        // Here is where you would add the new addresses to your DB. 

        res.status(200).send({
            status:'success',
            message: ''
        })


    });

    // Add deposits.
    app.post('/deposits', async(req, res) => {
    
        // Here is where you would add the new deposits to your DB. 

        res.status(200).send({
            status:'success',
            message: null,
            data: null
        })


    });

    // Validate Deposit Addresses.
    app.post('/validate/addresses', async(req, res) => {

        let validRequest = true
        let reqData = {}
 
        // This is basic validation for this example. In a live environment this should be replaced with something more robust. 
        try{
            reqData = JSON.parse(req.body).data
        } catch (e) {
            validRequest = false
        }

        if (
            reqData.xPubHash == undefined ||
            reqData.validationType == undefined ||
            reqData.xPubHash.length !== 64 ||
            !validationTypes.includes(reqData.validationType) ||
            isNaN(reqData.startIndex) ||
            isNaN(reqData.endIndex)
        ) {
            validRequest = false
        }

        if ( validRequest === false ) {

            res.status(400).send({
                status:'fail',
                message: 'Invalid request. Body must include data object with xPubHash, validationType, startIndex, and endIndex.',
                data: null
            })
            return

        }

        // Request to validate deposit addresses by hash. 
        if ( reqData.validationType === "hash") {

            let addressHash = ''

            try{
                // This is where you would retrieve the deposit addresses from the DB associated with the submitted xPubHash and in the startIndex to endIndex range then you would build a validation string and get the HEX encoded SHA256 hash. Here we simulate this by generating the addresses directly and hashing them. 
                addressHash = await getAddressHash(reqData.startIndex,reqData.endIndex)
            } catch(e) {
                console.log('Error generating address hash. Raw Error:',e)
                res.status(500).send({
                    status:'fail',
                    message: 'Unknown Error',
                    data: null
                })
                return
            }

            res.status(200).send({
                status:'success',
                message: null,
                data:{
                    hash: addressHash
                },
            })

        }

        if ( reqData.validationType === "address") {

            let addresses = {}

            try{
                addresses = await getAddresses(reqData.startIndex,reqData.endIndex)
            } catch(e) {
                console.log('Error generating addresses. Raw Error:',e)
                res.status(500).send({
                    status:'fail',
                    message: 'Unknown Error',
                    data: null
                })
                return
            }

            res.status(200).send({
                status:'success',
                message: null,
                data:{
                    addresses
                },
            })
            
        }


    });

    // Validate Deposits.
    app.post('/validate/deposits', async(req, res) => {

        let validRequest = true
        let reqData = {}

        // This is basic validation for this example. In a live environment this should be replaced with something more robust. 
        try{
            reqData = JSON.parse(req.body).data
        } catch (e) {
            validRequest = false
        }

        if (
            reqData.xPubHash == undefined ||
            reqData.xPubHash.length !== 64 ||
            isNaN(reqData.startBlock) ||
            isNaN(reqData.endBlock)
        ) {
            validRequest = false
        }

        if ( validRequest === false ) {

            res.status(400).send({
                status:'fail',
                message: 'Invalid request. Body must include data object with xPubHash, startBlock, and endBlock.',
                data: null
            })
            return

        }

        let deposits = {}

        try{
            deposits = await getDeposits(reqData.startBlock,reqData.endBlock)
        } catch(e) {
            res.status(500).send({
                status:'fail',
                message: 'Unknown Error',
                data: null
            })
            return
        }

        res.status(200).send({
            status:'success',
            message: null,
            data:{
                deposits
            },
        })

    })


    try{
        http.createServer(app).listen(serverPort);
        console.log(`Example Server running on port ${serverPort}`)
    } catch(e) {
        console.log(e)
    }


})();

/**
 * This is an EXAMPLE function for creating an address hash string. 
 * Addresses are generated here in a real API they would be retrieved from the DB.
 * @param {num} startIndex Index to start generating addresses from.
 * @param {num} numberToValidate Number of addresses to validate from index.
 * @returns {str} Hash of deposit addresses in range. 
 */
async function getAddressHash(startIndex,numberToValidate){

    const addGen = HdAddGen.withExtPub(
        config.addressGen.xpub,
        coin,
        bip=parseInt(config.addressGen.bip)
    )
    
    const addresses = await addGen.generate(parseInt(numberToValidate),parseInt(startIndex))

    let validationString = ''

    addresses.forEach(address => {
        validationString += `${address.index},${address.address},`
    })

    const validationHash = crypto.createHash('sha256').update(validationString).digest('hex')

    return validationHash

}

/**
 * This is an EXAMPLE function for formatting addresses for validation withing a certain range.  
 * In a real API these addresses would be returned from the DB.
 * @param {num} startIndex 
 * @param {num} numberToValidate 
 * @returns {obj} deposit address object. 
 */
async function getAddresses(startIndex,numberToValidate){

    const addGen = HdAddGen.withExtPub(
        config.addressGen.xpub,
        coin,
        bip=parseInt(config.addressGen.bip)
    )
    
    const addresses = await addGen.generate(parseInt(numberToValidate),parseInt(startIndex))

    let addObj = {}

    let index = startIndex
    addresses.forEach(address => {
        addObj[index] = address.address
        index++
    })

    return addObj

}

/**
 * This is an EXAMPLE function for retrieving deposits within a certain range and formatting them for validation. 
 * Raw wallet data is used instead of a DB.
 * @param {num} startBlock First block in range to retrieve deposits from.
 * @param {num} endBlock Last block in range to retrieve deposits from.
 * @returns 
 */
async function getDeposits(startBlock,endBlock){

    // Format wallet transactions. 
    let formDeposits = {}

    exampleDeposits.forEach(deposit => {
        // Exclude deposits outside of range. 
        if ( deposit.blockheight < startBlock || deposit.blockheight > endBlock ){
            return 
        }

        if ( formDeposits[deposit.txid] === undefined ) {
            formDeposits[deposit.txid] = {}
        }

        formDeposits[deposit.txid][deposit.address] = deposit.amount
    });

    return formDeposits

}

