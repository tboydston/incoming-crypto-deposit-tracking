config = { 
    "BTC":{
        xpub:"YOUR XPUB",
        bip:84,
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
        monitor:true 
    }
}

module.exports = config