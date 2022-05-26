
const fs = require('fs')
const HdAddGen = require('hdaddressgenerator')
const RequestManager = require('./lib/RequestManager')

const allConfigs = require('./config')
const validModes = ['show','walletOnly','remoteOnly','add']

const coin = process.argv[2]
const mode = process.argv[3]
const startIndex = process.argv[4]
const numberToGenerate = process.argv[5]

const config = allConfigs[coin]

;(async()=>{

    if( !validModes.includes(mode) ){
        console.log(`Invalid mode entered: ${process.argv[3]} Valid modes: ${validModes.join(', ')}`)
        process.exit()
    }

    if( isNaN(numberToGenerate) ){
        console.log(`Number of addresses to generate must be a number. You submitted: ${process.argv[2]}`)
        process.exit()
    }

    try {

        config.keys = {}
        config.keys.pub = fs.readFileSync(`./keys/${config.pubKey}`)
        config.keys.priv = fs.readFileSync(`./keys/${config.privKey}`)

    } catch (e){
        console.error(`Error loading signing keys. Raw Error: ${e.message}`)
        process.exit()
    }

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
        console.error(`Error loading request manager. Raw Error: ${e.message}`)
        process.exit()
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
        
        console.log(
            address.path,
            address.address,
            address.pubKey
        )

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
            console.error(`RPC server error. Raw Error: ${e.message}`)
        }

        //console.log("RPC Result:",rpcResponse.data)
             
    }

    if( ['remoteOnly','add'].includes(mode) ){
        try {
            remoteResponse = await requestManager.post(config.remoteRoute,remoteFormatted)
        } catch(e) {
            console.error(`Remote server error. Raw Error: ${e.message}`)
        }

        //console.log("Remote Result:",remoteResponse.data)
    }

})();

