
const fs = require('fs')
const RequestManager = require('../lib/RequestManager')
const allConfigs = require('../config')
const coin = process.argv[2]
const config = allConfigs[coin]

;(async()=>{

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

    let rpcResponse = {}

    try {
        rpcResponse = await requestManager.rpc("getblockchaininfo",[])    
    } catch(e) {
        console.error(`RPC server error. Raw Error: ${e.message}`)
    }

    let remoteResponse = {}
     
    try {
        remoteResponse = await requestManager.post("test",{msg:"ping"})    
    } catch(e) {
        console.error(`Remote server error. Raw Error: ${e.message}`)
    }

    console.log(rpcResponse.data,remoteResponse.data)
    
    
})();

