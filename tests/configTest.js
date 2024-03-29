const config = {
  BTC: {
    addressGen: {
      // Xpub and BIP used to generate your deterministic deposit addresses.
      // Created using seed 'brand improve symbol strike say focus ginger imitate ginger appear wheel brand swear relief zero'
      // DO NOT USED THIS XPUB IN YOUR PROD CONFIG FILE. YOU WILL LOSE ALL YOUR FUNDS!
      xpub: "zpub6qrsSadadY2LEWgupuqk7GSCbriHn2WQGVenBwNkBT3SHMBjt3LGD1Z1nJ6khrY2SSgMrCjkPsKmK4BdKZetunrhpYfqExWxFpuezmD2Rbj",
      bip: 84,
    },
    keyFiles: {
      // Files in the /keys folder that contain your public and private signing keys for platform requests.
      priv: "tests/keys/priv.key",
      pub: "tests/keys/pub.pem",
    },
    rpc: {
      // Bitcoin RPC server address.
      address: "http://127.0.0.1",
      port: 8332,
      user: "bitcoin",
      pass: "",
    },
    platform: {
      // Address information for your platform where new addresses and deposits will be sent.
      address: "https://www.yourplatform.com/",
      port: 443,
      routes: {
        addresses: "addresses",
        deposits: "deposits",
        validateAddresses: "validate/addresses",
        validateDeposits: "validate/deposits",
      },
    },
    notifications: {
      notifyTgOnConfirmations: [0, 1], // Send notification to Telegram on specified confirmations numbers.
      watchUntil: 2, // Update the platform on a deposit until X confirmations.
      telegram: {
        token: "2342342:tgtoken",
        chatId: "-23423423",
      },
    },
    chainMonitoring: {
      // Check to see if chain is adding new blocks.
      enabled: true,
      expectBlockPeriod: 3600, // Maximum number of seconds expected between blocks before a notification is sent to telegram indicating their may be a chain problem.
    },
    explorer: {
      // Explorer URLs are used to create links in TG messages.
      address: "https://www.blockchain.com/btc/address/",
      tx: "https://www.blockchain.com/btc/tx/",
      block: "https://www.blockchain.com/btc/block/",
    },
  },
};

module.exports = config;
