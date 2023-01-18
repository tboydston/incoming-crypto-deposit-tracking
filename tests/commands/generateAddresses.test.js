const fs = require("fs");

const generateAddresses = require("../../commands/generateAddresses");

const configs = require("../configTest");

const config = configs.BTC;

const mockRequestManager = {
  rpc: jest.fn(),
  post: jest.fn(),
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

describe("Command generateAddresses tests", () => {
  test("Should show results in console because mode is 'show' but not send results to wallet or platform.", async () => {
    await generateAddresses(
      {
        coin: "BTC",
        mode: "show",
        startIndex: "0",
        endIndex: "1",
      },
      config,
      mockRequestManager,
      mockLogManager
    );
    expect(mockRequestManager.rpc).toHaveBeenCalledTimes(0);
    expect(mockRequestManager.post).toHaveBeenCalledTimes(0);
    expect(mockLogManager.log.mock.calls[0][0]).toBe(
      "m/84'/0'/0'/0/0,bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu,03010b9a653a713a83d275cb9dedbd8b855ebb67d88d2a3e179c5e9a24dc71817c"
    );
    expect(mockLogManager.log.mock.calls[1][0]).toBe(
      "m/84'/0'/0'/0/1,bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf,0338c6c19d4d381433f5b8a72488b570fd3d59ad980515677852598e2cde9f9723"
    );
    expect(mockLogManager.log.mock.calls).toHaveLength(2);
  });
  test("Should sent results to wallet and show in console but not send to platform because mode is 'walletOnly'.", async () => {
    await generateAddresses(
      {
        coin: "BTC",
        mode: "walletOnly",
        startIndex: "0",
        endIndex: "1",
      },
      config,
      mockRequestManager,
      mockLogManager
    );
    expect(mockRequestManager.rpc.mock.calls[0][0]).toBe("importmulti");
    expect(JSON.stringify(mockRequestManager.rpc.mock.calls[0][1])).toBe(
      JSON.stringify([
        [
          {
            scriptPubKey: {
              address: "bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu",
            },
            timestamp: "now",
          },
          {
            scriptPubKey: {
              address: "bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf",
            },
            timestamp: "now",
          },
        ],
      ])
    );

    expect(mockRequestManager.post).toHaveBeenCalledTimes(0);

    expect(mockLogManager.log.mock.calls[0][0]).toBe(
      "m/84'/0'/0'/0/0,bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu,03010b9a653a713a83d275cb9dedbd8b855ebb67d88d2a3e179c5e9a24dc71817c"
    );
    expect(mockLogManager.log.mock.calls[1][0]).toBe(
      "m/84'/0'/0'/0/1,bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf,0338c6c19d4d381433f5b8a72488b570fd3d59ad980515677852598e2cde9f9723"
    );
    expect(mockLogManager.log.mock.calls).toHaveLength(2);
  });
  test("Should sent results to platform and show in console but not send to platform because mode is 'platfromOnly'.", async () => {
    await generateAddresses(
      {
        coin: "BTC",
        mode: "platformOnly",
        startIndex: "0",
        endIndex: "1",
      },
      config,
      mockRequestManager,
      mockLogManager
    );
    expect(mockRequestManager.rpc).toHaveBeenCalledTimes(0);

    expect(JSON.stringify(mockRequestManager.post.mock.calls[0][0])).toBe(
      '"addresses"'
    );
    expect(JSON.stringify(mockRequestManager.post.mock.calls[0][1])).toBe(
      '{"coin":"BTC","addresses":[{"xPubHash":"b523948c9f9d67e1768efbd42f7286a40777bfc0f6cc102b64cbb28158d7c207","index":0,"path":"m/84\'/0\'/0\'/0/0","address":"bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu","pubKey":"03010b9a653a713a83d275cb9dedbd8b855ebb67d88d2a3e179c5e9a24dc71817c"},{"xPubHash":"b523948c9f9d67e1768efbd42f7286a40777bfc0f6cc102b64cbb28158d7c207","index":1,"path":"m/84\'/0\'/0\'/0/1","address":"bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf","pubKey":"0338c6c19d4d381433f5b8a72488b570fd3d59ad980515677852598e2cde9f9723"}]}'
    );

    expect(mockLogManager.log.mock.calls[0][0]).toBe(
      "m/84'/0'/0'/0/0,bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu,03010b9a653a713a83d275cb9dedbd8b855ebb67d88d2a3e179c5e9a24dc71817c"
    );
    expect(mockLogManager.log.mock.calls[1][0]).toBe(
      "m/84'/0'/0'/0/1,bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf,0338c6c19d4d381433f5b8a72488b570fd3d59ad980515677852598e2cde9f9723"
    );
    expect(mockLogManager.log.mock.calls).toHaveLength(2);
  });
  test("Should sent results to platform, wallet and show in console because mode is 'add'.", async () => {
    await generateAddresses(
      {
        coin: "BTC",
        mode: "add",
        startIndex: "0",
        endIndex: "1",
      },
      config,
      mockRequestManager,
      mockLogManager
    );
    expect(mockRequestManager.rpc.mock.calls[0][0]).toBe("importmulti");
    expect(JSON.stringify(mockRequestManager.rpc.mock.calls[0][1])).toBe(
      JSON.stringify([
        [
          {
            scriptPubKey: {
              address: "bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu",
            },
            timestamp: "now",
          },
          {
            scriptPubKey: {
              address: "bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf",
            },
            timestamp: "now",
          },
        ],
      ])
    );

    expect(JSON.stringify(mockRequestManager.post.mock.calls[0][0])).toBe(
      '"addresses"'
    );
    expect(JSON.stringify(mockRequestManager.post.mock.calls[0][1])).toBe(
      '{"coin":"BTC","addresses":[{"xPubHash":"b523948c9f9d67e1768efbd42f7286a40777bfc0f6cc102b64cbb28158d7c207","index":0,"path":"m/84\'/0\'/0\'/0/0","address":"bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu","pubKey":"03010b9a653a713a83d275cb9dedbd8b855ebb67d88d2a3e179c5e9a24dc71817c"},{"xPubHash":"b523948c9f9d67e1768efbd42f7286a40777bfc0f6cc102b64cbb28158d7c207","index":1,"path":"m/84\'/0\'/0\'/0/1","address":"bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf","pubKey":"0338c6c19d4d381433f5b8a72488b570fd3d59ad980515677852598e2cde9f9723"}]}'
    );

    expect(mockLogManager.log.mock.calls[0][0]).toBe(
      "m/84'/0'/0'/0/0,bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu,03010b9a653a713a83d275cb9dedbd8b855ebb67d88d2a3e179c5e9a24dc71817c"
    );
    expect(mockLogManager.log.mock.calls[1][0]).toBe(
      "m/84'/0'/0'/0/1,bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf,0338c6c19d4d381433f5b8a72488b570fd3d59ad980515677852598e2cde9f9723"
    );
    expect(mockLogManager.log.mock.calls).toHaveLength(2);
  });
});
