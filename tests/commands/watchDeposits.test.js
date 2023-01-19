const fs = require("fs");

const watch = require("../../commands/watchDeposits");

const configs = require("../configTest");

const config = configs.BTC;

const validWalletTx = {
  transactions: [
    {
      blockheight: 10,
      txid: "txid1",
      address: "add1",
      amount: 10,
      confirmations: 3,
      category: "receive",
    },
    {
      blockheight: 11,
      txid: "txid2",
      address: "add2",
      amount: 11,
      confirmations: 2,
      category: "receive",
    },
    {
      blockheight: 12,
      txid: "txid3",
      address: "add3",
      amount: 12,
      confirmations: 1,
      category: "receive",
    },
    {
      blockheight: 12,
      txid: "txid3",
      address: "add4",
      amount: 122,
      confirmations: 1,
      category: "receive",
    },
  ],
};

const MockRequestManager = class RequestManager {
  constructor(rpcResponse) {
    this.rpcResponse = rpcResponse;
  }

  rpc(cmd) {
    return { data: { result: this.rpcResponse[cmd] } };
  }

  post = jest.fn();
};

const mockLogManager = {
  log: jest.fn(),
};

beforeAll(() => {
  config.keys = {};
  config.keys.pub = fs.readFileSync(`tests/keys/pub.pem`);
  config.keys.priv = fs.readFileSync(`tests/keys/priv.key`);
  fs.writeFileSync(`tests/data/lastDepositBlock-BTC.txt`, `0`);
  fs.writeFileSync(`tests/data/lastDepositBlockSuccess-BTC.txt`, `0`);
  fs.writeFileSync(`tests/data/lastDepositBlockNoNew-BTC.txt`, `12`);
  fs.writeFileSync(`tests/data/lastDepositBlockZeroConf-BTC.txt`, `0`);
  fs.writeFileSync(`tests/data/lastDepositWalletNotify-BTC.txt`, `0`);
  fs.writeFileSync(`tests/data/lastDepositBlockNotify-BTC.txt`, `0`);
  fs.writeFileSync(`tests/data/lastDepositNoUpdate-BTC.txt`, `0`);
  fs.writeFileSync(`tests/data/lastDepositNotifyNone-BTC.txt`, `0`);
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe("Command watchDeposits tests", () => {
  test("Should throw error data path is invalid.", async () => {
    const mockRequestManager = new MockRequestManager();
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = "invalid/invalid";

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "blockNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );
    }).rejects.toThrowError(`Error loading last block file.`);
  });
  test("Should throw error because validBlockHash RPC response is malformed.", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: validWalletTx,
      getblockchaininfo: undefined,
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositBlock-BTC.txt`;

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "blockNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );
    }).rejects.toThrowError(`RPC getblockchaininfo error.`);
  });
  test("Should throw no new transactions message.", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: { transactions: [] },
      getblockchaininfo: { blocks: 13 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositBlockNoNew-BTC.txt`;

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "blockNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );
    }).rejects.toThrowError(`No new transactions since`);
  });
  test("Should complete without exception, notify tg of transactions with 0 or 1 confirmations, notify platform of new deposits since block 0 and update data file to latest block 13.", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: validWalletTx,
      getblockchaininfo: { blocks: 13 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositBlockSuccess-BTC.txt`;

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "notifyAll",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );
      expect(mockRequestManager.post).toHaveBeenCalledTimes(1);
      expect(mockRequestManager.post.mock.calls[0][1].chainHeight).toBe(13);
      expect(mockRequestManager.post.mock.calls[0][1].txData[0].address).toBe(
        `add1`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[0].txid).toBe(
        `txid1`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[0].amount).toBe(
        10
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[3].address).toBe(
        `add4`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[3].txid).toBe(
        `txid3`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[3].amount).toBe(
        122
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData.length).toBe(4);

      expect(
        (mockLogManager.log.mock.calls[0][0].match(/Amount/g) || []).length
      ).toBe(2);
      expect(
        (mockLogManager.log.mock.calls[1][0].match(/amount/g) || []).length
      ).toBe(4);
      expect(mockLogManager.log.mock.calls[2][0]).toBe(
        "Last deposit block updated to 11"
      );
      expect(
        fs.readFileSync(localConfig.data.paths.lastDepositBlock).toString()
      ).toBe("11");
    }).not.toThrowError();
  });
  test("Should complete without exception, notify tg of transactions with 1,4 confirmations, notify platform of new deposits since block 0 but not update block data file because watchUntil confirmation limit is not yet hit.", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: validWalletTx,
      getblockchaininfo: { blocks: 13 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositNoUpdate-BTC.txt`;
    localConfig.notifications.notifyTgOnConfirmations = [1, 3];
    localConfig.notifications.watchUntil = 100;

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "notifyAll",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );

      expect(mockRequestManager.post).toHaveBeenCalledTimes(1);
      expect(mockRequestManager.post.mock.calls[0][1].chainHeight).toBe(13);
      expect(mockRequestManager.post.mock.calls[0][1].txData[0].address).toBe(
        `add1`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[0].txid).toBe(
        `txid1`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[0].amount).toBe(
        10
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[3].address).toBe(
        `add4`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[3].txid).toBe(
        `txid3`
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData[3].amount).toBe(
        122
      );
      expect(mockRequestManager.post.mock.calls[0][1].txData.length).toBe(4);

      expect(
        (mockLogManager.log.mock.calls[0][0].match(/Amount/g) || []).length
      ).toBe(3);

      expect(
        (mockLogManager.log.mock.calls[1][0].match(/amount/g) || []).length
      ).toBe(4);
      expect(mockLogManager.log.mock.calls.length).toBe(2);
      expect(
        fs.readFileSync(localConfig.data.paths.lastDepositBlock).toString()
      ).toBe("0");
    }).not.toThrowError();
  });
  test("Should notify of unconfirmed deposit but block data should not be updated because tx is unconfirmed.", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: {
        transactions: [
          {
            blockheight: 10,
            txid: "txid1",
            address: "add1",
            amount: 10,
            confirmations: 0,
            category: "receive",
          },
        ],
      },
      getblockchaininfo: { blocks: 10 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositBlockZeroConf-BTC.txt`;

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "walletNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );

      expect(mockRequestManager.post).toHaveBeenCalledTimes(1);
      expect(
        mockRequestManager.post.mock.calls[0][1].txData[0].confirmations
      ).toBe(0);
      expect(mockRequestManager.post.mock.calls[0][1].txData.length).toBe(1);
      expect(
        (mockLogManager.log.mock.calls[0][0].match(/Amount/g) || []).length
      ).toBe(1);
      expect(
        (mockLogManager.log.mock.calls[1][0].match(/amount/g) || []).length
      ).toBe(1);
      expect(
        fs.readFileSync(localConfig.data.paths.lastDepositBlock).toString()
      ).toBe("0");
    }).not.toThrowError();
  });
  test("Should NOT send notification to Telegram of unconfirmed deposit because unconfirmed notifications not set in config.", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: {
        transactions: [
          {
            blockheight: 10,
            txid: "txid1",
            address: "add1",
            amount: 10,
            confirmations: 0,
            category: "receive",
          },
        ],
      },
      getblockchaininfo: { blocks: 10 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositBlockZeroConf-BTC.txt`;
    localConfig.notifications.notifyTgOnConfirmations = [1];

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "walletNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );
      expect(mockRequestManager.post).toHaveBeenCalledTimes(1);

      expect(
        mockRequestManager.post.mock.calls[0][1].txData[0].confirmations
      ).toBe(0);
      expect(mockRequestManager.post.mock.calls[0][1].txData.length).toBe(1);
      expect(
        (mockLogManager.log.mock.calls[0][0].match(/amount/g) || []).length
      ).toBe(1);
      expect(
        fs.readFileSync(localConfig.data.paths.lastDepositBlock).toString()
      ).toBe("0");
    }).not.toThrowError();
  });
  test("Should NOT send notification to Telegram when method is 'walletNotify and confirmations are > 1'", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: {
        transactions: [
          {
            blockheight: 10,
            txid: "txid1",
            address: "add1",
            amount: 10,
            confirmations: 2,
            category: "receive",
          },
        ],
      },
      getblockchaininfo: { blocks: 11 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositWalletNotify-BTC.txt`;
    localConfig.notifications.notifyTgOnConfirmations = [1];

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "walletNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );

      expect(mockRequestManager.post).toHaveBeenCalledTimes(1);

      expect(
        mockRequestManager.post.mock.calls[0][1].txData[0].confirmations
      ).toBe(2);
      expect(mockRequestManager.post.mock.calls[0][1].txData.length).toBe(1);
      expect(mockLogManager.log.mock.calls.length).toBe(2);
      expect(
        (mockLogManager.log.mock.calls[0][0].match(/amount/g) || []).length
      ).toBe(1);
      expect(
        fs.readFileSync(localConfig.data.paths.lastDepositBlock).toString()
      ).toBe("10");
    }).not.toThrowError();
  });
  test("Should NOT send notification to Telegram when method is 'blockNotify' and confirmations are <= 1'", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: {
        transactions: [
          {
            blockheight: 10,
            txid: "txid1",
            address: "add1",
            amount: 10,
            confirmations: 1,
            category: "receive",
          },
        ],
      },
      getblockchaininfo: { blocks: 11 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositBlockNotify-BTC.txt`;
    localConfig.notifications.notifyTgOnConfirmations = [1];

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "blockNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );
      expect(mockRequestManager.post).toHaveBeenCalledTimes(1);
      expect(
        mockRequestManager.post.mock.calls[0][1].txData[0].confirmations
      ).toBe(1);
      expect(mockRequestManager.post.mock.calls[0][1].txData.length).toBe(1);
      expect(mockLogManager.log.mock.calls.length).toBe(1);
      expect(
        (mockLogManager.log.mock.calls[0][0].match(/amount/g) || []).length
      ).toBe(1);
      expect(
        fs.readFileSync(localConfig.data.paths.lastDepositBlock).toString()
      ).toBe("0");
    }).not.toThrowError();
  });
  test("Should NOT send notification to Telegram when method is 'notifyNone'", async () => {
    const mockRequestManager = new MockRequestManager({
      getblockhash: "validBlockHash",
      listsinceblock: {
        transactions: [
          {
            blockheight: 10,
            txid: "txid1",
            address: "add1",
            amount: 10,
            confirmations: 1,
            category: "receive",
          },
        ],
      },
      getblockchaininfo: { blocks: 11 },
    });
    const localConfig = JSON.parse(JSON.stringify(config));
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastDepositBlock = `tests/data/lastDepositNotifyNone-BTC.txt`;
    localConfig.notifications.notifyTgOnConfirmations = [1];

    expect(async () => {
      await watch(
        {
          coin: "BTC",
          method: "blockNotify",
        },
        localConfig,
        mockRequestManager,
        mockLogManager
      );
      expect(mockRequestManager.post).toHaveBeenCalledTimes(1);
      expect(
        mockRequestManager.post.mock.calls[0][1].txData[0].confirmations
      ).toBe(1);
      expect(mockRequestManager.post.mock.calls[0][1].txData.length).toBe(1);
      expect(mockLogManager.log.mock.calls.length).toBe(1);
      expect(
        (mockLogManager.log.mock.calls[0][0].match(/amount/g) || []).length
      ).toBe(1);
      expect(
        fs.readFileSync(localConfig.data.paths.lastDepositBlock).toString()
      ).toBe("0");
    }).not.toThrowError();
  });
});
