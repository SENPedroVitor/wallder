import path from "node:path";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dpapi } from "./protected-data.mjs";
export function createPamMailVault(dataDir, protection = dpapi) {
  const file = path.join(dataDir, "pam-mail-protected.json");
  async function read() {
    const saved = JSON.parse(await readFile(file, "utf8"));
    if (saved.version !== 1 || saved.protection !== "windows-user-dpapi")
      throw Error("Conta protegida indisponível.");
    return saved;
  }
  async function status() {
    try {
      await read();
      return { saved: true, protection: "Windows" };
    } catch (error) {
      if (error.code === "ENOENT")
        return { saved: false, protection: "Windows" };
      throw Error("Não foi possível consultar a conta protegida.");
    }
  }
  async function withAccount(operation) {
    const saved = await read(),
      bytes = (await protection()).unprotect(
        Buffer.from(saved.ciphertext, "base64"),
      );
    try {
      return await operation(JSON.parse(bytes.toString("utf8")));
    } finally {
      bytes.fill(0);
    }
  }
  async function save({ email, password }) {
    if (
      typeof email !== "string" ||
      !/^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(email) ||
      typeof password !== "string" ||
      password.length < 1 ||
      password.length > 1024
    )
      throw Error("Conta Gmail inválida.");
    const bytes = Buffer.from(
      JSON.stringify({ email: email.toLowerCase(), password }),
    );
    try {
      const encrypted = (await protection()).protect(bytes);
      await mkdir(dataDir, { recursive: true });
      await writeFile(
        file + ".tmp",
        JSON.stringify({
          version: 1,
          protection: "windows-user-dpapi",
          ciphertext: encrypted.toString("base64"),
        }),
        { mode: 0o600 },
      );
      await rename(file + ".tmp", file);
      return status();
    } finally {
      bytes.fill(0);
    }
  }
  return { status, save, withAccount };
}
export class PamMailService {
  constructor({ vault, browser }) {
    this.vault = vault;
    this.browser = browser;
  }
  async status() {
    const status = await this.vault.status();
    if (!status.saved) return status;
    const email = await this.vault.withAccount((account) => account.email);
    let connected = false;
    const page = this.browser.page;
    if (page && new URL(page.url()).origin === "https://mail.google.com")
      connected = await page
        .locator('a[aria-label][href^="https://accounts.google.com/"]')
        .elementHandles()
        .then(async (handles) => {
          try {
            for (const handle of handles)
              if (
                await handle
                  .evaluate((node) =>
                    (node.getAttribute("aria-label") || "").toLowerCase(),
                  )
                  .then((label) => label.includes(email))
              )
                return true;
            return false;
          } finally {
            await Promise.allSettled(handles.map((handle) => handle.dispose()));
          }
        })
        .catch(() => false);
    return { ...status, email, connected };
  }
  async execute(args, run) {
    if (run.agentId !== "pam") throw Error("A conta de e-mail pertence à Pam.");
    if (args.action === "status") return this.status();
    if (!(await this.vault.status()).saved)
      throw Error("Nenhuma conta de e-mail cadastrada para a Pam.");
    if (args.action === "connect") {
      let result;
      try {
        result = await this.browser.execute(
          { action: "open", url: "https://mail.google.com/" },
          run,
          async () => false,
        );
      } catch (error) {
        if (!/detached Frame/i.test(error.message)) throw error;
        await this.browser.serialized(async () => {
          this.browser.requireScope(run);
          if (run.cancelled) throw Error("Tarefa interrompida.");
          this.browser.page = await this.browser.context.newPage();
          this.browser.observation = null;
        });
        result = await this.browser.execute(
          { action: "open", url: "https://mail.google.com/" },
          run,
          async () => false,
        );
      }
      if (new URL(result.url).origin === "https://workspace.google.com") {
        const links = result.targets.filter(
          (target) =>
            /^(?:sign in(?:to gmail)?|fazer login|entrar)$/i.test(
              target.name.trim(),
            ) &&
            target.href &&
            new URL(target.href, result.url).origin ===
              "https://accounts.google.com",
        );
        const urls = [
          ...new Set(
            links.map((target) => new URL(target.href, result.url).href),
          ),
        ];
        if (urls.length === 1)
          result = await this.browser.execute(
            { action: "open", url: urls[0] },
            run,
            async () => false,
          );
      }
      return {
        ...(await this.status()),
        url: result.url,
        observationId: this.browser.observation?.id,
        text: result.text,
        targets: result.targets,
        message:
          "Confira a conta real. Não declare conexão concluída sem chegar à caixa de entrada e verificar o endereço.",
      };
    }
    if (args.action !== "login_step") throw Error("Ação de e-mail inválida.");
    return this.browser.serialized(async () => {
      this.browser.requireScope(run);
      if (run.cancelled) throw Error("Tarefa interrompida.");
      const page = this.browser.page,
        url = new URL(page.url());
      if (
        url.origin !== "https://accounts.google.com" ||
        !/\/signin|\/ServiceLogin/i.test(url.pathname)
      )
        throw Error(
          "O preenchimento protegido só funciona na página oficial de login do Google.",
        );
      await page.waitForSelector?.(
        'input[type="password"],input[type="email"]',
        { visible: true, timeout: 10000 },
      );
      const loginUrl = new URL(page.url());
      if (
        loginUrl.origin !== url.origin ||
        !/\/signin|\/ServiceLogin/i.test(loginUrl.pathname)
      )
        throw Error("A página mudou.");
      const passwords = await page
          .locator('input[type="password"]')
          .elementHandles(),
        emails = await page.locator('input[type="email"]').elementHandles(),
        handles = [...passwords, ...emails];
      try {
        const fields = [];
        for (const handle of handles)
          if (await handle.isVisible().catch(() => false)) fields.push(handle);
        if (fields.length !== 1)
          throw Error(
            "O Google pode estar pedindo verificação. Conclua essa etapa diretamente no navegador, sem enviar códigos no chat.",
          );
        const field = fields[0],
          isPassword = passwords.includes(field);
        this.browser.observation = null;
        await this.vault.withAccount(async (account) => {
          if (
            run.cancelled ||
            page !== this.browser.page ||
            page.url() !== loginUrl.href
          )
            throw Error("A página mudou.");
          if (isPassword) {
            const body = await page.locator("body").innerText();
            if (!body.toLowerCase().includes(account.email))
              throw Error(
                "O endereço da conta não pôde ser confirmado antes de usar a senha.",
              );
          }
          await field.fill(isPassword ? account.password : account.email);
          await field.press("Enter");
        });
        return {
          filled: true,
          field: isPassword ? "senha protegida" : "e-mail",
          message:
            "Preenchimento feito localmente no Google. Observe novamente. Não leia nem repita a senha. O Google pode exigir confirmação adicional.",
        };
      } catch {
        throw Error(
          "Não foi possível concluir o login protegido. Verifique a etapa diretamente no navegador.",
        );
      } finally {
        await Promise.allSettled(handles.map((handle) => handle.dispose()));
      }
    });
  }
}
export const pamMailTools = [
  {
    type: "function",
    name: "wendler_pam_mail",
    description:
      "Pam only: use the separately registered Gmail account. status returns registration and address, never the password. connect opens Gmail in the persistent agent browser. login_step privately fills the single visible email/password field only on the official Google sign-in page; no credentials in tool arguments. Verify the actual inbox account before claiming connected. Hand off CAPTCHA/2FA to the user. No email sending authorization is implied by account registration.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["status", "connect", "login_step"] },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
];
