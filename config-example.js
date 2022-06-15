config = { 
    "BTC":{
        addressGen:{ // Xpub and BIP used to generate your deterministic deposit addresses.
            xpub:"YOUR XPUB",
            bip:84
        },  
        keyFiles:{ // Files in the /keys folder that contain your public and private signing keys for platform requests. 
            priv:"priv.key",
            pub:"pub.pem"
        },
        rpc:{ // Bitcoin RPC server address. 
            address:"http://127.0.0.1",
            port:8332,
            user:"bitcoin",
            pass:""
        },
        platform:{ // Address information for your platform where new addresses and deposits will be sent.
            address:"https://www.yourplatform.com/",
            port:443,
            routes:{
                addresses:"addresses",
                deposits:"deposits",
                validateAddresses:"validate/addresses",
                validateDeposits:"validate/deposits"
            }
        },
        notifications:{
            unconfirmed:true, // Send a Telegram notification when their is a new unconfirmed transaction.
            confirm:true, // Send a Telegram notification when their is a new confirmed transaction.
            watchUntil:4, // Update the platform on a deposit until X confirmations. 
            when:0, // Not when a certain number of confirmations is reached. Can't be greater than watchConfirmations. 
            telegram:{
                token:"2342342:tgtoken",
                chatId:"-23423423"
            }
        },
        chainMonitoring:{ // Check to see if chain is adding new blocks. 
            enabled:true,
            expectBlockPeriod:3600 // Maximum number of seconds expected between blocks before a notification is sent to telegram indicating their may be a chain problem.
        },
        explorer:{ // Explorer URLs are used to create links in TG messages. 
            address:"https://www.blockchain.com/btc/address/",
            tx:"https://www.blockchain.com/btc/tx/",
            block:"https://www.blockchain.com/btc/block/"
        }    
    }
}

module.exports = config