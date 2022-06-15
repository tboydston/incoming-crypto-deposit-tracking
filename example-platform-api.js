const fs = require('fs')
const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
const sigMan = require("./lib/signatureManager")
const pubKey = fs.readFileSync(`./keys/pub.pem`)
const crypto = require('crypto')
const HdAddGen = require('hdaddressgenerator')

const serverPort = 7001

const validationTypes = ['hash','address']

// Used to generate example responses. 
const allConfigs = require('./config')
const coin = process.argv[2]
const config = allConfigs[coin]
if ( config === undefined ){
    console.log('Coin must be defined. Example: node example-platform.js BTC')
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

        res.status(403).send({
            status:'fail',
            message: 'Invalid signature.'
        })

    })

    // Add addresses. 
    app.post('/addresses', async(req, res) => {
    
        // Here is where you would add the new addresses to your DB. 
        console.log("New Addresses")
        console.log(req.body)

        res.status(200).send({
            status:'success',
            message: ''
        })


    });

    // Add deposits.
    app.post('/deposits', async(req, res) => {
    
        // Here is where you would add the new deposits to your DB. 
        console.log("New Deposits")
        console.log(req.deposits)

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

        console.log("New Deposit Address Validation Request.")
       
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


    try{
        http.createServer(app).listen(serverPort);
        console.log(`Example Server running on port:${serverPort}`)
    } catch(e) {
        console.log(e)
    }


})();


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

