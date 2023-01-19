const fs = require("fs");

const validate = require("../../commands/validateDeposits");

const configs = require("../configTest");

const config = configs.BTC;

const validWalletTx = [
  {
    blockheight: 10,
    txid: "txid1",
    address: "add1",
    amount: 10,
  },
  {
    blockheight: 11,
    txid: "txid2",
    address: "add2",
    amount: 11,
  },
  {
    blockheight: 12,
    txid: "txid3",
    address: "add3",
    amount: 12,
  },
  {
    blockheight: 12,
    txid: "txid3",
    address: "add4",
    amount: 122,
  },
];

const validPlatformTxs = {
  txid1: {
    add1: 10,
  },
  txid2: {
    add2: 11,
  },
  txid3: {
    add3: 12,
    add4: 122,
  },
};

const mockLogManager = {
  log: jest.fn(),
};

beforeAll(() => {
  config.keys = {};
  config.keys.pub = fs.readFileSync(`tests/keys/pub.pem`);
  config.keys.priv = fs.readFileSync(`tests/keys/priv.key`);
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe("Command validateDeposits tests", () => {
  test("Should throw an error due to invalid platform response structure.", async () => {
    const postResponseObj = {
      data: {
        invalid: {
          deposits: [],
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          startBlock: 0,
          endBlock: 100,
        },
        config,
        {
          post: () => postResponseObj,
          rpc: () => {},
        },
        mockLogManager
      );
    }).rejects.toThrowError(`Platform server error.`);
  });
  test("Should throw an error due to invalid rpc response structure.", async () => {
    const postResponseObj = {
      data: {
        data: {
          deposits: [],
        },
      },
    };

    const rpcResponseObj = {
      error: "error",
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          startBlock: 0,
          endBlock: 100,
        },
        config,
        {
          post: () => postResponseObj,
          rpc: () => rpcResponseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`RPC server error.`);
  });
  test("Should throw success message because wallet tx match platform tx.", async () => {
    const postResponseObj = {
      data: {
        data: {
          deposits: validPlatformTxs,
        },
      },
    };

    const rpcResponseObj = {
      data: {
        result: {
          transactions: validWalletTx,
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          startBlock: 0,
          endBlock: 100,
        },
        config,
        {
          post: () => postResponseObj,
          rpc: () => rpcResponseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`SUCCESS`);
  });
  test("Should throw fail message because platform deposits don't match wallet deposits.", async () => {
    const invalidPlatformTxs = JSON.parse(JSON.stringify(validPlatformTxs));

    invalidPlatformTxs.txid1.add1 = 200;

    const postResponseObj = {
      data: {
        data: {
          deposits: invalidPlatformTxs,
        },
      },
    };

    const rpcResponseObj = {
      data: {
        result: {
          transactions: validWalletTx,
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          startBlock: 0,
          endBlock: 100,
        },
        config,
        {
          post: () => postResponseObj,
          rpc: () => rpcResponseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`10 BTC | Platform Amount: 200 BTC`);
  });
  test("Should throw fail message because wallet deposits don't match platform deposits.", async () => {
    const invalidWalletTx = JSON.parse(JSON.stringify(validWalletTx));

    invalidWalletTx[0].amount = 200;
    const postResponseObj = {
      data: {
        data: {
          deposits: validPlatformTxs,
        },
      },
    };

    const rpcResponseObj = {
      data: {
        result: {
          transactions: invalidWalletTx,
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          startBlock: 0,
          endBlock: 100,
        },
        config,
        {
          post: () => postResponseObj,
          rpc: () => rpcResponseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`Wallet Amount: 200 BTC | Platform Amount: 10 BTC`);
  });
  test("Should throw fail message because wallet deposits don't match platform deposits in send to many tx.", async () => {
    const invalidWalletTx = JSON.parse(JSON.stringify(validWalletTx));

    invalidWalletTx[3].amount = 200;

    const postResponseObj = {
      data: {
        data: {
          deposits: validPlatformTxs,
        },
      },
    };

    const rpcResponseObj = {
      data: {
        result: {
          transactions: invalidWalletTx,
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          startBlock: 0,
          endBlock: 100,
        },
        config,
        {
          post: () => postResponseObj,
          rpc: () => rpcResponseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(
      `Wallet Amount: 200 BTC | Platform Amount: 122 BTC`
    );
  });
});
