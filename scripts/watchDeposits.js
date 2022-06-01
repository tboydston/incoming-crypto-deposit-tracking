
const fs = require('fs')
const RequestManager = require('../lib/RequestManager')
const LogManager = require('../lib/LogManager')

const allConfigs = require('../config');

const coin = process.argv[2]
const config = allConfigs[coin]

;(async()=>{

    // Load log manager. 
    try {
        lm = new LogManager(
            'deposits',
            coin,
            config.tgToken,
            config.tgChatId,
            "Watch Deposits"
        )
    } catch (e){
        console.log(`Error loading log manager. Raw Error: ${e.message}`)
        return
    }

    // Load keys used for signing addresses to remote server.
    try {

        config.keys = {}
        config.keys.pub = fs.readFileSync(`./keys/${config.pubKey}`)
        config.keys.priv = fs.readFileSync(`./keys/${config.privKey}`)

    } catch (e){
        lm.log(`Error loading signing keys. Raw Error: ${e.message}`,true,true)
        return
    }

    // Check to see if lastDepositBlock file exists for coin if not create it at 0.
    try {

        if ( !fs.existsSync(`../data/lastDepositBlock-${coin}.txt`) ) {
            fs.writeFileSync(`../data/lastDepositBlock-${coin}.txt`, "0");
        }

    } catch (e) {
        lm.log(`Error reading checking or creating last block file. Raw Error: ${e.message}`,true,true)
        return
    }
    
    let data = {}

    // Read file containing last block to determine which block we should look for new deposits from. 
    try {

        data.lastDepositBlock = fs.readFileSync(`../data/lastDepositBlock-${coin}.txt`).toString()

    } catch (e){
        lm.log(`Error loading last block. Raw Error: ${e.message}`,true,true)
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
        lm.log(`Error loading request manager. Raw Error: ${e.message}`,true,true)
        return
    }

    // Convert the last block number to a block hash which is required by the lastsinceblock RPC function.
    let hashResponse = {}

    try{
        hashResponse = await requestManager.rpc("getblockhash",[parseInt(data.lastDepositBlock)])   
    } catch(e) {
        lm.log(`RPC server error. Raw Error: ${e.message}`,true,true)
        return
    }

    if ( hashResponse.data.result == undefined || hashResponse.data.error != null ){
        lm.log(`RPC getblockhash malformed. Raw Response: ${JSON.stringify(hashResponse.data)}`,true,true)
        return 
    }

    data.lastHash = hashResponse.data.result

    let txResponse = {}

    // Request transactions since last confirmed deposit. 
    try{
        txResponse = await requestManager.rpc("listsinceblock",[data.lastHash,1,true])   
    } catch(e) {
        lm.log(`RPC server error. Raw Error: ${e.message}`,true,true)
        return
    }

    if ( txResponse.data.result.transactions == undefined ){
        return 
    }

    //console.log("RPC Result:",txResponse.data.result.transactions)

    if ( txResponse.data.result.transactions == undefined ) {
        lm.log(`RPC listsinceblock malformed. Raw Response: ${JSON.stringify(txResponse.data)}`,true,true)
        return 
    }

    const txs = txResponse.data.result.transactions

    if ( txs.length == 0 ) {
        lm.log(`No new transactions since block ${data.lastDepositBlock}`)
        return 
    }

    let txData = []
    let depositString = ""
    let heighestBlock = 0

    // Format transactions for platform. 
    txs.forEach(tx => {
        
        if ( tx.category !== 'receive' ) return
       
        txData.push({
            address: tx.address,
            amount: tx.amount,
            confirmations: tx.confirmations,
            block: tx.blockheight,
            txid: tx.txid
        })

        depositString += 
        `Deposit ${txData.length}
        Address: ${tx.address}
        Amount: ${tx.amount}
        Confirmations: ${tx.confirmations}
        Block: ${tx.blockheight}
        TxId: ${tx.txid}\n`

        if ( tx.blockheight != undefined && tx.blockheight > heighestBlock ) {
            heighestBlock = tx.blockheight
        }

    });

    if ( txData.length > 0 ){
        lm.log(`Incoming Deposit(s): \n${depositString}`,true,true)
        
    }

    // Send deposit info to platform.
    try {
        remoteResponse = await requestManager.post(config.remoteRouteDeposits,{
            coin,
            txData,
        })
    } catch(e) {
        lm.log(`Error sending deposits to platform. Confirm platform API is operating. Raw Error: ${e.message}`,true,true)
        return
    }

    // Only unconfirmed transactions were found so we don't reset the highest block. 
    if ( heighestBlock == 0 ) return

    // Update last block number in file. 
    try {
        fs.writeFileSync(`../data/lastDepositBlock-${coin}.txt`, heighestBlock.toString());
    } catch (e) {
        lm.log(`Error writing last deposit block. Check to make sure disk is not full. Raw Error: ${e.message}`,true,true)
        return
    }
    
})();
