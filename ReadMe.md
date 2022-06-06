# Simple Crypto Deposit Tracking

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


