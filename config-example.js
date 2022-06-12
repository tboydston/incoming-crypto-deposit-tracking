config = { 
    "BTC":{
        xpub:"YOUR XPUB",
        bip:84, // BIP 84 will produce p2wpkh 'bc1' addresses.
        privKey:"priv.key", // Name of private key file in keys/ folder.
        pubKey:"pub.pem", // Name of public key file in keys/ folder.
        rpcAddress:"http://127.0.0.1",
        rpcPort:"8332",
        rpcUser:"bitcoin",
        rpcPass:"password",
        remoteAddress:"http://localhost", // "remote" refers to api called to deliver addresses and deposit information.
        remotePort:"7000",
        remoteRouteAddresses:"addresses/",
        remoteRouteDeposits:"deposits/",
        tgToken:"", // Telegram bot token. 
        tgChatId:"", // Telegram chat room ID. See: https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id
        monitor:true,
        expectBlockPeriod:3600, // Maximum number of seconds expected between blocks before a notification is sent to telegram indicating their may be a chain problem. 
        notifyUnconfirmed:true, // Notify when there is a deposit that is not yet confirmed. 
        notifyConfirmed:true, // Notify when a tx is confirmed. 
        notifyWhen:0, // Notify when a certain number of confirmations is reached. Can't be greater than watchConfirmations and won't notify unless it is greater than 1.  
        explorerAddressUrl:"https://www.blockchain.com/btc/address/", // Explorer URLs are used to create links in TG messages. 
        explorerTxUrl:"https://www.blockchain.com/btc/tx/",
        explorerBlockUrl:"https://www.blockchain.com/btc/block/"
    }
}

module.exports = config