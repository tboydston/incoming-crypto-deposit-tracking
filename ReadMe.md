# Simple Crypto Deposit Tracking ( SCDT )

## Overview

Simple Crypto Deposit Tracking is a set of scripts used to generate deterministic deposits addresses from a extended public key, monitor these addresses for deposits, and notify an external platform and telegram group of new incoming deposits. 

### Features

- BIP 39 deterministic address generation. 
- Uses only xPub key so no private keys are exposed. 
- Signed API request to platform to confirm authenticity of requests. 
- Integration with Telegram to notify admin of incoming deposits or chain issues. 
- Only makes outgoing request so no need to open additional ports. 

## Requirements

- Fully synced instance of bitcoind with RPC enabled. 
- Remote POST API to configured to receive new addresses and deposits as well as verify request signatures.
- Telegram Bot Id and Group Id to send incoming notifications to. 
- Node JS ( >= v16 )


## Setup 

Clone this repository. 

``
git clone https://github.com/tboydston/simplecrytodeposittracking.git 
``

Next copy create a config file by copying the config-example.js to config.js

``
cp config-example.js config.js
``

Open the config.js file and fill in your values. 

``

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
        watchConfirmations:4, // Update the platform on a deposit until X confirmations. 
        notifyUnconfirmed:true, // Notify when there is a deposit that is not yet confirmed. 
        notifyConfirmed:true, // Notify when a tx is confirmed. 
        notifyWhen:0, // Not when a certain number of confirmations is reached. Can't be greater than watchConfirmations. 
        explorerAddressUrl:"https://www.blockchain.com/btc/address/", // Explorer URLs are used to create links in TG messages. 
        explorerTxUrl:"https://www.blockchain.com/btc/tx/",
        explorerBlockUrl:"https://www.blockchain.com/btc/block/" 
    }
}

``

## Getting your Bitcoind RPC credentials

Bitcoind RPC credentials can be set in the bitcoin.conf file. 

Instructions on how to find the .conf file can be found [here](https://github.com/bitcoin/bitcoin/blob/master/doc/bitcoin-conf.md#default-configuration-file-locations)

Currently `rpcuser` and `rpcpassword` are used for authentication. As authentication via username and password will soon be deprecated future version will switch to cookie based authentication. 

This guide assumes that you are running SCDT on the same server as Bitcoind. If you are not you can consider mapping the RPC port from the server where Bitcoind is hosted to the server where SCDT is hosted. Instruction on how to do this can be found [here](https://linuxize.com/post/how-to-setup-ssh-tunneling/#:~:text=For%20remote%20port%20forwarding%2C%20enter,in%20the%20Source%20Port%20field.). 

### WARNING 

Make sure to change the default username and password.

## Creating your Telegram bot and retrieving your chatID

Follow the instructions [here](https://core.telegram.org/bots) to create your bot. 

Create a group in Telegram that you would like deposit notifications to be sent to and then add your bot. 

Follow one of the solutions [here](https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id) on how to retrieve your ChatId.

## Getting Your Extended Public Key ( xPub )

Trezor: See [Here](https://wiki.trezor.io/Suite_manual:Displaying_account_public_key_(XPUB)#:~:text=Go%20to%20the%20Accounts%20tab,QR%20code%20and%20as%20text.)
Electrum: Select "Wallet" from the menu bar and then "Information". The key is in the 'Master Public Key' section.
Ledger: See [Here](https://support.ledger.com/hc/en-us/articles/360011069619-Extended-public-key?docs=true)

### WARNING 

While funds cannot be stolen if an attacked possesses only your extended public key it can but used to recreated your address chain. This will reveal all of your deposits addresses and make your wallet trackable. Treat this key as a critical secret. 

## Generating Signing Keys

In the 'scripts' folder is a js file called generateKeyPairs.js. This can be used to generate a public and private key pair. 

``
node scripts/generateKeyPairs.js
``

Output will be shown on the console. Copy and paste the private key to file called 'priv.key' in the 'keys' folder. Copy and paste the public key to a file called 'pub.pem' in the keys folder. The public key will be shared with your platform and used to verify the signature of requests to your platform API. 

### WARNING 

Treat the 'priv.key' as a critical secret. If compromised it could be used to send fake deposits notifications to your platform or add addresses to the server that you do not control the private keys to. 

## Additional walletnotify and blocknotify Settings to Bitcoind.conf

Open your bitcoin.conf and add the following settings. 

``
walletnotify=node /[PATH TO SCDT]/scripts/watchDeposits.js BTC walletNotify
blocknotify=node /[PATH TO SCDT]/scripts/watchDeposits.js BTC blockNotify

``

Then restart bitcoind. These settings will call the watchDeposit script after each transaction and register incoming deposits. 

### NOTE 

If the watchDeposits script is not being executed correctly confirm that node js is accessible to all users. For linux systems see this [article](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-with-nvm-node-version-manager-on-a-vps).

