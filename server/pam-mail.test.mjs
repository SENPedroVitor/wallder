import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createPamMailVault, PamMailService } from "./pam-mail.mjs";
test("protected mail storage keeps address and password out of the saved file and status", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wendler-mail-"));
  const protection = async () => ({
    protect: (bytes) => Buffer.from(bytes.map((byte) => byte ^ 123)),
    unprotect: (bytes) => Buffer.from(bytes.map((byte) => byte ^ 123)),
  });
  try {
    const vault = createPamMailVault(root, protection);
    await vault.save({ email: "test@gmail.com", password: "fixture-password" });
    const raw = await readFile(
      path.join(root, "pam-mail-protected.json"),
      "utf8",
    );
    assert.equal(raw.includes("fixture-password"), false);
    assert.equal(raw.includes("test@gmail.com"), false);
    assert.equal(
      JSON.stringify(await vault.status()).includes("fixture-password"),
      false,
    );
    assert.equal(
      await vault.withAccount((account) => account.email),
      "test@gmail.com",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("mail login belongs to Pam and cannot fill a lookalike Google origin", async () => {
  let filled = false;
  const vault = {
    status: async () => ({ saved: true }),
    withAccount: async (operation) =>
      operation({ email: "test@gmail.com", password: "fixture-password" }),
  };
  const browser = {
    serialized: (fn) => fn(),
    requireScope() {},
    page: {
      url: () => "https://accounts.google.com.evil.test/signin",
      locator: () => {
        filled = true;
      },
    },
  };
  const service = new PamMailService({ vault, browser });
  await assert.rejects(
    service.execute({ action: "login_step" }, { agentId: "homer" }),
    /pertence/,
  );
  await assert.rejects(
    service.execute({ action: "login_step" }, { agentId: "pam" }),
    /oficial/,
  );
  assert.equal(filled, false);
});
