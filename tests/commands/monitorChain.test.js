const fs = require("fs");

const monitorChain = require("../../commands/monitorChain");

const configs = require("../configTest");

const config = configs.BTC;

const MockRequestManager = class RequestManager {
  constructor(rpcResponse) {
    this.rpcResponse = rpcResponse;
  }

  rpc() {
    return this.rpcResponse;
  }

  static post() {
    return true;
  }
};

beforeEach(() => {
  jest.resetAllMocks();
});

beforeAll(() => {
  fs.writeFileSync(`tests/data/lastBlockValid-BTC.txt`, `10:${Date.now()}`);
  fs.writeFileSync(`tests/data/lastBlockValid-2-BTC.txt`, `10:${Date.now()}`);
  fs.writeFileSync(`tests/data/lastBlockOld-BTC.txt`, `10:100`);
});

describe("Command monitorChain tests", () => {
  test("Should throw error because chain monitoring is disabled.", async () => {
    const localConfig = Object.create(config);
    localConfig.chainMonitoring = false;
    const mockRequestManager = new MockRequestManager();

    expect(async () => {
      await monitorChain(
        {
          coin: "BTC",
        },
        localConfig,
        mockRequestManager,
        {}
      );
    }).rejects.toThrowError(`Monitoring disabled for BTC`);
  });
  test("Should throw error data path is invalid.", async () => {
    const mockRequestManager = new MockRequestManager();
    const localConfig = Object.create(config);
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastBlock = "invalid/invalid";

    expect(async () => {
      await monitorChain(
        {
          coin: "BTC",
        },
        localConfig,
        mockRequestManager,
        {}
      );
    }).rejects.toThrowError(
      `Error reading, checking, or creating last block file.`
    );
  });
  test("Should throw error because chain has not updated.", async () => {
    const mockRequestManager = new MockRequestManager({
      data: {
        result: 10,
        error: null,
      },
    });
    const localConfig = Object.create(config);
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastBlock = `tests/data/lastBlockOld-BTC.txt`;

    expect(async () => {
      await monitorChain(
        {
          coin: "BTC",
        },
        localConfig,
        mockRequestManager,
        {}
      );
    }).rejects.toThrowError(`Exceeding`);
  });
  test("Should throw message because chain has not updated but still within warning threshold.", async () => {
    const mockRequestManager = new MockRequestManager({
      data: {
        result: 10,
        error: null,
      },
    });
    const localConfig = Object.create(config);
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastBlock = `tests/data/lastBlockValid-BTC.txt`;

    expect(async () => {
      await monitorChain(
        {
          coin: "BTC",
        },
        localConfig,
        mockRequestManager,
        {}
      );
    }).rejects.toThrowError(`Within`);
  });
  test("Should throw message that there is a new block.", async () => {
    const mockRequestManager = new MockRequestManager({
      data: {
        result: 11,
        error: null,
      },
    });
    const localConfig = Object.create(config);
    localConfig.data = {};
    localConfig.data.paths = {};
    localConfig.data.paths.lastBlock = `tests/data/lastBlockValid-2-BTC.txt`;

    expect(async () => {
      await monitorChain(
        {
          coin: "BTC",
        },
        localConfig,
        mockRequestManager,
        {}
      );
    }).rejects.toThrowError(`New`);
  });
});
