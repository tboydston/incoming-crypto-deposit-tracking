# Simple Crypto Deposit Tracking ( SCDT )

## Overview

Simple Crypto Deposit Tracking is used to generate deterministic deposits addresses from a extended public key, monitor these addresses for deposits, and notify an external platform and telegram group of new incoming deposits, monitor running chains and periodically audit deposit and address records. 

### Features

- Self sovereign
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

Step 1: [Clone the repository](#clone-the-repository)
Step 2: [Install and configure bitcoind](#getting-your-bitcoind-rpc-credentials) 
Step 3: [Configure your platforms API](#platform-routes)
Step 4: [Create your Telegram bot](#creating-your-telegram-bot-and-retrieving-your-chatid)
Step 5: [Get your extended public key](#getting-your-extended-public-key--xpub)
Step 6: [Add your config values](#add-your-config-values)
Step 7: [Add notify routes to bitcoind](#additional-walletnotify-and-blocknotify-settings-to-bitcoindconf)

Step 8: [Add chain monitoring to your crontab](#monitoring-chains)
Step 9: [Add address auditing to your crontab](#validating-addresses)
Step 10: [Add deposit auditing to your crontab](#validate-deposits)


## Clone the Repository

``
git clone https://github.com/tboydston/simplecrytodeposittracking.git 
``

## Add Your Config Values

Create a config file by copying the config-example.js to config.js

``
cp config-example.js config.js
``

Open the config.js file and fill in your values. 

``

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

``



## Getting your Bitcoind RPC credentials

Bitcoind RPC credentials can be set in the bitcoin.conf file. 

Instructions on how to find the .conf file can be found [here](https://github.com/bitcoin/bitcoin/blob/master/doc/bitcoin-conf.md#default-configuration-file-locations)

Currently `rpcuser` and `rpcpassword` are used for authentication. As authentication via username and password will soon be deprecated future version will switch to cookie based authentication. 

This guide assumes that you are running SCDT on the same server as Bitcoind. If you are not you can consider mapping the RPC port from the server where Bitcoind is hosted to the server where SCDT is hosted. Instruction on how to do this can be found [here](https://linuxize.com/post/how-to-setup-ssh-tunneling/#:~:text=For%20remote%20port%20forwarding%2C%20enter,in%20the%20Source%20Port%20field.). 

### WARNING 

Make sure to change the default username and password.


## Configuring your Platform API

A functioning example endpoint is provided and may be used as a reference. To run it add the following values to your config.js file. 

``
    platform:{
        address:"http://127.0.0.1",
        port:7001,
        routes:{
            addresses:"addresses",
            deposits:"deposits",
            validateAddresses:"validate/addresses",
            validateDeposits:"validate/deposits"
        }
    },
``

Then run the following command from the project root directory. 

``
node example-platform.js
``

### Platform Routes

You will need to add 4 POST routes to your platform. The actual names of these routes may be changed in the config file. 

``
/addresses
/deposits
/validate/addresses
/validate/deposits
``

All request will be sent with the below request structure. 

*Example Request Body*

``
{"nonce":1655348865573,"data":{REQUEST DATA OBJECT}}
``

SCDT is expecting the following response structure but in most cases it just checks for a '200' HTTP response. 

``
{
    status:['success'|'fail'],
    message: 'If the request fails it is best to include a message.',
    data: null
}
``

### Signing and Nonce

Every request to your platform will be signed using RSA-256 saved as hex and included in the 'Signature' header. The body will also include a nonce before transmission. Every request should be verified against SCDT's pubKey to insure it is valid and the nonce checked to insure it is not more then a few seconds old. For further details on the signing and POST requests see the lib/RequestManager.js and lib/signatureManger.js files.


### Route: /addresses

Receives an array of addresses. The same addresses may be sent more then once and duplicate addresses should not be allowed in the platforms DB. Also all fields submitted will never be updated and if possible should be to prevent accidental or malicious changes. 

*Example Request Data*
``
{
  coin: 'BTC',
  addresses: [{
        xPubHash: '93f50d6676288093c9f58becad57fd65aa12ae70ccd961039dec0ebb080a9868',
        index: 1,
        path: "m/84'/0'/0'/0/1",
        address: 'bc1qcp0t2g0s7m6gul7wmuq4q4xjusrz7q5uhutest',
        pubKey: '02449dbf873fc99dd194953ab34a076982a1cb014b54063c54c533edd9ee5test'
    },
    {
        xPubHash: '93f50d6676288093c9f58bec4e57fd65aa12ae70ccd961039dec0ebb080a9868',
        index: 2,
        path: "m/84'/0'/0'/0/2",
        address: 'bc1qgl88uxk5d9bmnrvru0ww0th35uzcwv3jytest2',
        pubKey: '03a8a72147af8ac933a6f6d2d2ede6172ea0a3187eb33a707a5fd1f993b65test'
    }]
}
``

### Route: /deposit

Receives an array of deposits. The same deposits may be will be sent more then once as new confirmations are received. Txid and address act as a shared ID and you should never have duplicate records with the same txid and address. SCDT will keep sending updates on a deposit as new blocks come in until the number of confirmations reaches the 'notifications.notifyUntil' value. Each time you receive a new update you should update the number of confirmations for that deposit record in the DB. 

*Example Request Data*
``
{
    "coin": "BTC", 
    "txData": [{
        "xPubHash": "93f50d6676288093c9f58bec4e57fd65aa12ae70ccd961039dec0ebb080a9868",
        "address": "bc1q46y8dujhsy4wl52m4xlkdarp6uvlj280rktest",
        "amount": 1.0001,
        "confirmations": 0,
        "block": 739526,
        "txid": "bf0980ef2b56288570535f6e34e84da57704657a0aa77669c34a48dcadfftest"
    }, {
        "xPubHash": "93f50d6676288093c9f58bec4e57fd65aa12ae70ccd961039dec0ebb080a9868",
        "address": "bc1ql2vsmnjmzkj7adqkf4d9hehgfmj4c8a8vstest",
        "amount": 2.3422,
        "confirmations": 1,
        "block": 739527,
        "txid": "541d5beb1f5a79bcfbebfbfab0f30dcc0595e73f15c335ada78bc70197ectest"
    }]
``

### Route: /validate/addresses

Receives a request for either a hash of a concated string of address or all addresses withing a certain range. For details on how the address string that is hashed should be generated or how the addresses should be formatted see the getAddressHash and getAddress functions in the example-platform-api.js. See also the [Validate Addresses](#Validating-Addresses) section.

*Example Request Data*
``
{
    "xPubHash": "83f50d6676288093c9f58becbd57fd65a612ae70ced961039dec0ebb080a9869",
    "validationType": "hash", // This may be "hash" or "address"
    "startIndex": 0,
    "endIndex": 10
}
``

*Expected Response*

Hash Request
``
{
    status: 'success',
    message: null,
    data: {
        hash: '3405e67bb8c9d9812c7a5546ad6903a5db61a4d3b737bc306f4e0f10ac610774'
    }
}
``

Address Request
``
{
  status: 'success',
  message: null,
  data: {
    addresses: {
      '0': 'bc1q802fv7hwyf52m6xq3e5pzx2vw8zsttya66fj7f',
      '1': 'bc1q0s9ccry2pa8qhuq836aatfhqtg448je8ynnzpe',
      '2': 'bc1ql2vsmnjmzkj7adqkf4d9hehefmj4c8a8vsy0rq',
      '3': 'bc1qe2cd2wagtz44k5pdxefua5rguammgq5yjrvxpm',
      '4': 'bc1qk2qmkfrl9cp3u746dz0ceghj0trz93k3yeuwuh',
      '5': 'bc1q4ths6lkr8kdav9ugsc4zmkvnwmhptd78s8t8f7',
      '6': 'bc1qhsgh38tpv60x7c5nu5ac0wku7qc6337359jdc6',
      '7': 'bc1q4st2uve9e56v3vrg39wp5jdy25nf33qsuhxhz3',
      '8': 'bc1qcp0t2g0r7m6gul7wmuq4q4xjusrz7q5uhuv9e8',
      '9': 'bc1qgl88uxk5d9amnrvru0ww0th35uzcwv3jym26h8'
    }
  }
}
``


### Route: /validate/deposits

Receives a request for all deposits within a specified block range and returns them in a specific format for validation. For details on how to structure the response see the getDeposits function in the example-platform-api.js file. See also the [Validate Deposits](#Validating-Deposits) section.

*Example Request Data*
``
{
    "xPubHash": "83f50d6676288093c9f58becbd57fd65a612ae70ced961039dec0ebb080a9869",
    "startBlock": 0,
    "endBlock": 1000000
}
``

*Expected Response*

``
{
	"status": "success",
	"message": null,
	"data": {
		"deposits": {
			"bf0980ef2b55288570535f6e34e84dd58704657a0aa77669c34a48dcadftest": {
				"bc1q46y7dujhsy4wl52m4xlkd4rp5uvlj280rtest": 0.0031
			},
			"4fb2af08108a90da88198039642c59bd1385132c38d836ae459e5fb3d269atest": {
				"bc1q0s9ccry2pa8qhuq836aatfhqtg448je8yntest": 2.0001
			}
		}
	}
}

``

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

## Monitoring Chains

Overall Bitcoind is very reliable and properly configure on a properly spec'ed server it can run for months without an issue. That said there are several failure cases for Bitcoind that we need to monitor for. In the first case, for one reason or another Bitcoind because unresponsive and does not answer requests. In the second Bitcoind remains responsive but does not add blocks. This can happen when you have either run out of hard drive space or if you missed a critical update and the new blocks being mined do not pass your version block validation. The monitorChains script checks for these cases by periodically calling the 'getblockcount' API to see if the chain has updated within an expected period of time defined in your config file. Bitcoin for example adds a new block on average of every 10 minutes but in some circumstances such as a mining difficulty adjustment this period could extend to 1 or 2 hours. 

In your config file adjust the following settings. 

``
    chainMonitoring:{ // Check to see if chain is adding new blocks. 
        enabled:true,
        expectBlockPeriod:3600 // Maximum number of seconds expected between blocks before a notification is sent to telegram indicating their may be a chain problem.
    },
``

Then in your crontab file add line executing the script as often as you would like. 

*Example*
``
*/10 * * * * /[full path to node]/node /[path to folder]/scripts/monitorChains.js >> /[path to folder]/logs/monitorChains/monitorChainsCron.log
``

### NOTE 

Make sure and include the full path to node and that this version is executable by crontab.

## Validating Addresses 

The validateAddresses script audits the addresses associated with a xPub on the remote platform. It does this by regenerating the address chain within a specific range and then comparing them either by hash or one by one to the addresses on the platform. This insures that the addresses available on the platform have not been corrupted or tampered with. Unless you have very few addresses it is best to validate by hash first. If your find inconsistencies the you can validate by address to learn what these inconsistencies are. Inconsistencies are sent as a notification via Telegram and logged in the logs/validateAddress folder. 

To understand how your platforms endpoint should format the response data see the 'example-platform-api.js' file for a working example. 

This script can be set as cron job to validate addresses periodically. 

*Example*
``
* */1 * * * /[full path to node]/node /[path to folder]/scripts/validateAddresses.js BTC hash 0 10000 >> /[path to folder]/logs/validateAddresses/validateAddressesCron.log
``


### NOTE 

This is not the only measure that should be taken in order to ensure address integrity. You should take additional measure on your platform to insure that addresses are not added under a new xPubHash, modified before being sent to the user, or changed when displayed on the frontend. 

## Validate Deposits

The validateDeposits script audits the deposits associated with a xPub on the remote platform. It does this by requesting all deposits associated with a specific xPub and comparing the results to deposits in the wallet to insure deposits have not been corrupted or tampered with. If any inconsistencies are found details are sent via telegram and saved in the logs/validateDeposits folder. If any deposits are found missing on the platform they can be added by setting the lastBlock in the data/lastBlock-[coin].txt to below the block of the missing TX and running the watchDeposits script.

To understand how your platforms endpoint should format the response data see the 'example-platform-api.js' file for a working example. 

This script can be set as cron job to validate deposits periodically. 

*Example*
``
* */1 * * * /[full path to node]/node /[path to folder]/scripts/validateDeposits.js BTC 0 1000000 >> /[path to folder]/logs/validateDeposits/validateDepositsCron.log
``

### NOTE 

This is not the only measure that should be taken to insure deposit integrity. This method only looks for xPubHash keys that SCDT knows about. A fake deposit could still be inserted under a different xPubHash