
const fs = require('fs')
const crypto = require('crypto')
const HdAddGen = require('hdaddressgenerator')
const RequestManager = require('../lib/RequestManager')

const allConfigs = require('../config')
const LogManager = require('../lib/LogManager')
const validModes = ['show','walletOnly','platformOnly','add']

const coin = process.argv[2]
const mode = process.argv[3]
const startIndex = process.argv[4]
const numberToGenerate = process.argv[5]

const config = allConfigs[coin]

/**
 * Generate deterministic addresses and add them to a local Bitcoind like wallet and remote platform API.
 */
;(async()=>{

    if ( config === undefined ){
        console.log('Coin must be defined. Example: node generateAddresses.js BTC show 0 1')
    }

    // Load log manager. 
    try {
        lm = new LogManager(
            'generateAddresses',
            coin,
            config.notifications.telegram.token,
            config.notifications.telegram.chatId,
            "Generate Addresses"
        )
    } catch (e){
        console.log(`Error loading log manager. Raw Error: ${e.message}`)
        return
    }

    // Validate submitted mode. 
    if( !validModes.includes(mode) ){
        lm.log(`Invalid mode entered: ${process.argv[3]} Valid modes: ${validModes.join(', ')}`)
        return
    }

    // Validate index and number to generate.  
    if( isNaN(startIndex) || isNaN(numberToGenerate) ){
        lm.log(`Index and number of addresses to generate must be a number. Example: node generateAddresses.js BTC show 0 1`)
        return
    }

    // Load keys used for signing requests to remote server.
    try {

        config.keys = {}
        config.keys.pub = fs.readFileSync(`${__dirname}/../keys/${config.keyFiles.pub}`)
        config.keys.priv = fs.readFileSync(`${__dirname}/../keys/${config.keyFiles.priv}`)

    } catch (e){
        lm.log(`Error loading signing keys. Raw Error: ${e.message}`)
        return
    }

    // Initiate RequestManager class used for making RPC and signed platform API requests. 
    let requestManager = {}

    try {

        requestManager = new RequestManager(
            config.platform.address,
            config.platform.port,
            config.rpc.address,
            config.rpc.port,
            config.rpc.user,
            config.rpc.pass,
            config.keys.priv,
            config.keys.pub
        )

    } catch(e) {
        lm.log(`Error loading request manager. Raw Error: ${e.message}`)
        return
    }

    let addGen = HdAddGen.withExtPub(
            config.addressGen.xpub,
            coin,
            bip=parseInt(config.addressGen.bip)
        )
        
    let addresses = await addGen.generate(parseInt(numberToGenerate),parseInt(startIndex))

    let remoteFormatted = {
        coin:coin,
        addresses:[]
    }

    let rpcFormatted = []
    let pubKeyHash = crypto.createHash('sha256').update(config.addressGen.xpub).digest('hex')

    let index = startIndex
    addresses.forEach(address => {

        lm.log(`${address.path},${address.address},${address.pubKey}`,true,false)

        remoteFormatted.addresses.push({
            xPubHash:pubKeyHash,
            index:parseInt(index),
            path:address.path,
            address:address.address,
            pubKey:address.pubKey
        })

        rpcFormatted.push(
            { "scriptPubKey": 
                {
                     "address": address.address
                 },
                "timestamp":"now"
            }
        )

        index++

    });

    let rpcResponse = {}
    let remoteResponse = {}

    if( ['walletOnly','add'].includes(mode) ){
        try{
            rpcResponse = await requestManager.rpc("importmulti",[rpcFormatted])   
        } catch(e) {
            lm.log(`RPC server error. Raw Error: ${e.message}`)
        }        
    }

    if( ['platformOnly','add'].includes(mode) ){
        try {
            remoteResponse = await requestManager.post(config.platform.routes.addresses,remoteFormatted)
        } catch(e) {
            lm.log(`Remote server error. Raw Error: ${e.message}`)
        }
    }


})();

