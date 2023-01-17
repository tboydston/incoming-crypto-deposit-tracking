const generate = require("../../commands/generateSigningKeyPair");

const mockLogManager = {
  log: jest.fn(),
};

describe("Command generateSigningKeyPair tests", () => {
  test("Should generate pub and priv signing keys.", async () => {
    const result = await generate({}, {}, {}, mockLogManager);

    expect(result.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
    expect(result.privateKey).toContain("-----BEGIN PRIVATE KEY-----");
  });
});
