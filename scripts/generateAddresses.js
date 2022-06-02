
const fs = require('fs')
const HdAddGen = require('hdaddressgenerator')
const RequestManager = require('../lib/RequestManager')

const allConfigs = require('../config')
const LogManager = require('../lib/LogManager')
const validModes = ['show','walletOnly','remoteOnly','add']

const coin = process.argv[2]
const mode = process.argv[3]
const startIndex = process.argv[4]
const numberToGenerate = process.argv[5]

const config = allConfigs[coin]

/**
 * Generate deterministic addresses and add them to a local Bitcoind like wallet and remote platform API.
 */
;(async()=>{

    // Load log manager. 
    try {
        lm = new LogManager(
            'generateAddresses',
            coin,
            config.tgToken,
            config.tgChatId
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

    // Validate submitted number. 
    if( isNaN(numberToGenerate) ){
        lm.log(`Number of addresses to generate must be a number. You submitted: ${process.argv[2]}`)
        return
    }

    // Load keys used for signing requests to remote server.
    try {

        config.keys = {}
        config.keys.pub = fs.readFileSync(`${__dirname}/../keys/${config.pubKey}`)
        config.keys.priv = fs.readFileSync(`${__dirname}/../keys/${config.privKey}`)

    } catch (e){
        lm.log(`Error loading signing keys. Raw Error: ${e.message}`)
        return
    }

    // Initiate RequestManager class used for making RPC and signed platform API requests. 
    let requestManager = {}

    try {

        requestManager = new RequestManager(
            config.remoteAddress,
            config.remotePort,
            config.rpcAddress,
            config.rpcPort,
            config.rpcUser,
            config.rpcPass,
            config.keys.priv,
            config.keys.pub
        )

    } catch(e) {
        lm.log(`Error loading request manager. Raw Error: ${e.message}`)
        return
    }

    let addGen = HdAddGen.withExtPub(
            config.xpub,
            coin,
            bip=parseInt(config.bip)
        )
        
    let addresses = await addGen.generate(parseInt(numberToGenerate),parseInt(startIndex))

    let remoteFormatted = {
        coin:coin,
        addresses:[]
    }

    let rpcFormatted = []

    addresses.forEach(address => {
        
        lm.log(`${address.path},${address.address},${address.pubKey}`,true,false)

        remoteFormatted.addresses.push({
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

    if( ['remoteOnly','add'].includes(mode) ){
        try {
            remoteResponse = await requestManager.post(config.remoteRouteAddresses,remoteFormatted)
        } catch(e) {
            lm.log(`Remote server error. Raw Error: ${e.message}`)
        }
    }

})();

