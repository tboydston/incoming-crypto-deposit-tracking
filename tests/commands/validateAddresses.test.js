const fs = require("fs");
const crypto = require("crypto");

const validate = require("../../commands/validateAddresses");

const configs = require("../configTest");

const config = configs.BTC;

const addressesString = `0,bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu,1,bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf,`;
// const addressObj = {
//   0: "bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu",
//   1: "bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf",
// };

// const mockRequestManager = {
//   rpc: jest.fn(),
//   post: (requestData) => {
//     if (requestData.validationType === "hash") {
//       return crypto.createHash("sha256").update(addressesString).digest("hex");
//     }
//     return addressObj;
//   },
// };

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

describe("Command validateAddresses tests", () => {
  test("Should throw an error because platform hash request is malformed.", async () => {
    const responseObj = {
      data: {
        data: "malformed",
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          validationType: "hash",
          startIndex: 0,
          endIndex: 1,
        },
        config,
        {
          post: () => responseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`Remote platform request malformed`);
  });
  test("Should throw a fail message because hash is invalid.", async () => {
    const responseObj = {
      data: {
        data: {
          hash: "f1234d75178d892a133a410355a5a990cf75d2f33eba25d575943d4df632f3a4",
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          validationType: "hash",
          startIndex: 0,
          endIndex: 1,
        },
        config,
        {
          post: () => responseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`FAIL - Validation of Addresses by Hash`);
  });
  test("Should throw a success message because hash is valid.", async () => {
    const responseObj = {
      data: {
        data: {
          hash: crypto
            .createHash("sha256")
            .update(addressesString)
            .digest("hex"),
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          validationType: "hash",
          startIndex: 0,
          endIndex: 1,
        },
        config,
        {
          post: () => responseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`SUCCESS - Validation of Addresses by Hash`);
  });
  test("Should throw an error because platform address request is malformed.", async () => {
    const responseObj = {
      data: {
        data: { addresses: "malformed" },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          validationType: "address",
          startIndex: 0,
          endIndex: 1,
        },
        config,
        {
          post: () => responseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(
      `Remote platform request malformed. Expected object of addresses`
    );
  });
  test("Should throw a fail message because addresses are invalid.", async () => {
    const responseObj = {
      data: {
        data: {
          addresses: {
            0: "bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu",
            1: "invalid",
          },
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          validationType: "address",
          startIndex: 0,
          endIndex: 1,
        },
        config,
        {
          post: () => responseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(``);
  });
  test("Should throw a success message because address is valid.", async () => {
    const responseObj = {
      data: {
        data: {
          addresses: {
            0: "bc1qs40f5r7gd675n9g9ahu054emds3nwdn0mhctvu",
            1: "bc1qlu5lj3gfrx7ewt322kd3hgna6fmsywhuaxxcrf",
          },
        },
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          validationType: "address",
          startIndex: 0,
          endIndex: 1,
        },
        config,
        {
          post: () => responseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`SUCCESS - Validation of Addresses`);
  });
  test("Should throw an unknown error message because validationType is invalid.", async () => {
    const responseObj = {
      data: {
        data: {},
      },
    };

    expect(async () => {
      await validate(
        {
          coin: "BTC",
          validationType: "invalid",
          startIndex: 0,
          endIndex: 1,
        },
        config,
        {
          post: () => responseObj,
        },
        mockLogManager
      );
    }).rejects.toThrowError(`Unknown address validation error.`);
  });
});
