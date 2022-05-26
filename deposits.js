
const fs = require('fs')
const RequestManager = require('./lib/RequestManager')

const allConfigs = require('./config');
const coin = process.argv[2]
const config = allConfigs[coin]

;(async()=>{

    try {

        config.keys = {}
        config.keys.pub = fs.readFileSync(`./keys/${config.pubKey}`)
        config.keys.priv = fs.readFileSync(`./keys/${config.privKey}`)

    } catch (e){
        console.error(`Error loading signing keys. Raw Error: ${e.message}`)
        return
    }

    let data = {}

    try {

        data.lastBlock = fs.readFileSync(`./data/lastBlock-${coin}.txt`).toString()

    } catch (e){
        console.error(`Error loading last hash. Raw Error: ${e.message}`)
        return
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
        return
    }

    let hashResponse = {}

    try{
        hashResponse = await requestManager.rpc("getblockhash",[parseInt(data.lastBlock)])   
    } catch(e) {
        console.error(`RPC server error. Raw Error: ${e.message}`)
        return
    }

    if ( hashResponse.data.result == undefined || hashResponse.data.error != null ){
        console.error(`RPC getblockhash malformed. Raw Response: ${JSON.stringify(hashResponse.data)}`)
        return 
    }

    data.lastHash = hashResponse.data.result

    let txResponse = {}

    try{
        txResponse = await requestManager.rpc("listsinceblock",[data.lastHash,1,true])   
    } catch(e) {
        console.error(`RPC server error. Raw Error: ${e.message}`)
        return
    }

    if ( txResponse.data.result.transactions == undefined ){
        return 
    }

    console.log("RPC Result:",txResponse.data.result.transactions)

    if ( txResponse.data.result.transactions == undefined ) {
        console.error(`RPC listsinceblock malformed. Raw Response: ${JSON.stringify(txResponse.data)}`)
        return 
    }

    const txs = txResponse.data.result.transactions

    if ( txs.length == 0 ) {
        console.log(`No new transactions since block ${data.lastHash}`)
        return 
    }

    let txData = []
    let heighestBlock = 0

    txs.forEach(tx => {
        
        if ( tx.category !== 'receive' ) return
       
        txData.push({
            address: tx.address,
            amount: tx.amount,
            confirmations: tx.confirmations,
            block: tx.blockheight,
            txid: tx.txid
        })

        if ( tx.blockheight != undefined && tx.blockheight > heighestBlock ) {
            heighestBlock = tx.blockheight
        }

    });

    console.log(txData)
    console.log(heighestBlock)
    try {
        remoteResponse = await requestManager.post(config.remoteRouteDeposits,{
            coin,
            txData,
        })
    } catch(e) {
        console.error(`Remote server error. Raw Error: ${e.message}`)
        return
    }

    if ( heighestBlock == 0 ) return

    try {
        fs.writeFileSync(`./data/lastBlock-${coin}.txt`, heighestBlock.toString());
    } catch (e) {
        console.error(`Error writing last block. Raw Error: ${e.message}`)
        return
    }
    
})();
