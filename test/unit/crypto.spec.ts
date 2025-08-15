import { describe, it, expect } from "vitest";

import { encryptPassword, decryptPassword } from "../../src/utils/crypto.ts";

describe("crypto", () => {
  it("encrypts and decrypts passwords with AES-GCM", () => {
    const s = "super-secret";
    const enc = encryptPassword(s);
    expect(enc.split(":").length).toBe(3);
    const dec = decryptPassword(enc);
    expect(dec).toBe(s);
  });

  it("falls back to base64 for legacy strings", () => {
    const base64 = Buffer.from("hello").toString("base64");
    expect(decryptPassword(base64)).toBe("hello");
  });
});
