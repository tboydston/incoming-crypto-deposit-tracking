const fs = require("fs");
const validate = require("../../lib/validationManager");

let testPubKey = "";
let testPrivKey = "";

beforeAll(() => {
  testPubKey = fs.readFileSync(`tests/keys/pub.pem`);
  testPrivKey = fs.readFileSync(`tests/keys/priv.key`);
});

describe("Library validationManager tests", () => {
  describe("Function command() tests", () => {
    test("Should throw error when command is invalid.", () => {
      expect(async () => {
        await validate.command("invalidCommand");
      }).rejects.toThrow();
    });
    test("Should throw error when command is invalid.", async () => {
      const result = await validate.command("generateAddresses");
      expect(result).toBe("generateAddresses");
    });
  });
  describe("Function options() tests", () => {
    test("Should throw error because required option format is invalid.", async () => {
      const args = ["", "", "", "invalidOption"];

      try {
        await validate.options("generateAddresses", args);
      } catch (e) {
        expect(e.message.split(".")[0]).toBe("Invalid option: invalidOption ");
      }
    });
    test("Should throw error because required option 'startIndex' is an invalid type.", async () => {
      const args = [
        "",
        "",
        "",
        "coin=BTC",
        "startIndex=invalid",
        "endIndex=100",
        "mode=show",
      ];

      expect(async () => {
        await validate.options("generateAddresses", args);
      }).rejects.toThrowError(
        "Options type for startIndex is invalid. Expected number, received 'invalid' of type string."
      );
    });
    test("Should throw error because required option 'mode' is not valid.", async () => {
      const args = [
        "",
        "",
        "",
        "coin=BTC",
        "startIndex=1",
        "endIndex=100",
        "mode=invalid",
      ];

      expect(async () => {
        await validate.options("generateAddresses", args);
      }).rejects.toThrowError(
        "Option mode is invalid. Received: invalid, Expected one of: show,walletOnly,platformOnly,add"
      );
    });
    test("Should throw error because required option 'coin' is not set.", async () => {
      const args = ["", "", "", "startIndex=1", "endIndex=100", "mode=show"];

      expect(async () => {
        await validate.options("generateAddresses", args);
      }).rejects.toThrowError("Required option 'coin' not set.");
    });
    test("Should set 'mode' to default value 'show' because no value is set.", async () => {
      const args = ["", "", "", "coin=BTC", "startIndex=1", "endIndex=100"];
      const result = await validate.options("generateAddresses", args);

      expect(result.mode).toBe("show");
      expect(result.config).toBe("../config.js");
    });
  });
  describe("Function config() tests", () => {
    test("Should throw error when config files doesn't exist.", () => {
      expect(async () => {
        await validate.config("tests/invalid.js", "BTC");
      }).rejects.toThrowError(`Error loading config file 'tests/invalid.js'.`);
    });
    test("Should throw error when coin config doesn't exist.", () => {
      expect(async () => {
        await validate.config("../tests/configTest.js", "INVALID");
      }).rejects.toThrowError(`Error loading config for coin 'INVALID'.`);
    });
    test("Should throw error when pub key path doesn't exist.", () => {
      expect(async () => {
        await validate.config("../tests/configInvalidTest.js", "BTC");
      }).rejects.toThrowError(`invalid-pub.pem`);
    });
    test("Should load keys in tests/keys folder into config object.", async () => {
      const config = await validate.config("../tests/configTest.js", "BTC");
      expect(config.keys.pub.toString()).toMatch(testPubKey.toString());
      expect(config.keys.priv.toString()).toMatch(testPrivKey.toString());
    });
  });
});
