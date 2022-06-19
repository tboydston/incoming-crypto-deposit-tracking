const fs = require('fs')
const crypto = require('crypto')
const RequestManager = require('../lib/RequestManager')

const allConfigs = require('../config')
const LogManager = require('../lib/LogManager')

const coin = process.argv[2]
let startBlock = process.argv[3]
let endBlock = process.argv[4]

const config = allConfigs[coin]

/**
 * Compares wallet deposits to platform deposits to look for inconsistencies. 
 */
;(async()=>{

    if ( config === undefined ){
        console.log('Coin must be defined. Example: node validateAddresses.js BTC')
    }

    // Load log manager. 
    try {
        lm = new LogManager(
            'validateDeposits',
            coin,
            config.notifications.telegram.token,
            config.notifications.telegram.chatId,
            "Validate Deposits"
        )
    } catch (e){
        console.log(`Error loading log manager. Raw Error: ${e.message}`)
        return
    }

    // Validate startBlock and endBlock.  
    if( isNaN(startBlock) || isNaN(endBlock) ){
        lm.log(`StartBlock and EndBlock must be a numbers. Example: node validateDeposits.js BTC 10000 90000`)
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

    // Build request to platform for addresses within a certain range associated with a public key. 
    let pubKeyHash = crypto.createHash('sha256').update(config.addressGen.xpub).digest('hex')

    startBlock = parseInt(startBlock)
    endBlock = parseInt(endBlock)

    let requestData = {
        xPubHash:pubKeyHash,
        startBlock,
        endBlock
    }

    let platformTxs = {}

    try {
        const platformResponse = await requestManager.post(config.platform.routes.validateDeposits,requestData)
        platformTxs = platformResponse.data.data.deposits
    } catch(e) {
        lm.log(`Platform server error. Raw Error: ${e.message}`,true,true)
        return
    }

    // Convert the last deposit block number to a block hash which is required by the lastsinceblock RPC function.
    let hashResponse = {}

    try{
        hashResponse = await requestManager.rpc("getblockhash",[parseInt(startBlock)])   
    } catch(e) {
        lm.log(`RPC server error. Raw Error: ${e.message}`,true,true)
        return
    }

    if ( hashResponse.data.result == undefined || hashResponse.data.error != null ){
        lm.log(`RPC getblockhash malformed. Raw Response: ${JSON.stringify(hashResponse.data)}`,true,true)
        return 
    }

    let walletResponse = {}

    // Request transactions since last confirmed deposit. 
    try{
        walletResponse = await requestManager.rpc("listsinceblock",[hashResponse.data.result,1,true])   
    } catch(e) {
        lm.log(`RPC server error. Raw Error: ${e.message}`,true,true)
        return
    }

    const walletTxs = walletResponse.data.result.transactions

    let inconsistencies = ''

    // Compare wallet TXs to platform TXs to look for inconsistencies.
    walletTxs.forEach(walletTx => {
        
        if ( walletTx.block > endBlock ){
            return
        }

        // Confirm TX exists on platform.
        if ( platformTxs[walletTx.txid] === undefined ){
            inconsistencies += `Wallet ${coin} tx ${walletTx.txid} in block ${walletTx.blockheight} missing on platform, `
            return
        }

        // Confirm deposit exists in tx. 
        const depsInTx = platformTxs[walletTx.txid]

        if ( depsInTx[walletTx.address] === undefined ){
            inconsistencies += `Wallet deposit to address ${walletTx.address} for ${walletTx.amount} ${coin} in tx ${walletTx.txid} in block ${walletTx.blockheight} missing on platform, `
            return
        }

        // Confirm amount of each deposit is equal. 
        const depositAmount = depsInTx[walletTx.address]

        if ( depositAmount !==  walletTx.amount ) {
            inconsistencies += `Wallet deposit to address ${walletTx.address} in tx ${walletTx.txid} in block ${walletTx.blockheight} amount is different in wallet than on platform. Wallet Amount: ${walletTx.amount} ${coin} | Platform Amount: ${depositAmount} ${coin} , `
            return
        }


    })

    // Format wallet transactions. 
    let formWalletTxs = {}

    walletTxs.forEach(walletTx => {
        if ( formWalletTxs[walletTx.txid] === undefined ) {
            formWalletTxs[walletTx.txid] = {}
        }
        formWalletTxs[walletTx.txid][walletTx.address] = walletTx.amount
    });

    // Compare platform TXs to wallet TXs to look for inconsistencies.
    for (const txid in platformTxs) {
        
        const depsInTx = platformTxs[txid];
        // Confirm TX exists in wallet.
        if ( formWalletTxs[txid] === undefined ){
            inconsistencies += `Platform ${coin} tx ${txid} missing in wallet, `
            break
        }

        for (const address in depsInTx) {
            
            // Confirm deposit exists in tx. 
            if ( formWalletTxs[txid][address] === undefined ){
                inconsistencies += `Platform deposit to address ${address} for ${formWalletTxs[txid][address]} ${coin} in tx ${txid} missing in wallet, `
                break
            }

            const walletAmount = formWalletTxs[txid][address]

            // Confirm deposit amount.
            if ( parseFloat(walletAmount) !== parseFloat(depsInTx[address]) ){
                inconsistencies += `Platform deposit to address ${address} in tx ${txid} amount is different in platform than on wallet. Wallet Amount: ${walletAmount} ${coin} | Platform Amount: ${depsInTx[address]} ${coin} , `
                break
            }

        }


    }

    if ( inconsistencies.length > 0  ) {
        lm.log(`Platform ${coin} deposit inconsistencies found for block range ${startBlock} to ${endBlock}. Inconsistencies: ${inconsistencies}`,true,true)
    } else {
        lm.log(`Platform ${coin} deposits match wallet for range ${startBlock} to ${endBlock} when compared by address.`,true,false)
    } 



})();

