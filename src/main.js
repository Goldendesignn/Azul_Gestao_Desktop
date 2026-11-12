import "./style.css";

const setupView = document.querySelector("#setup-view");
const loginView = document.querySelector("#login-view");
const workspaceView = document.querySelector("#workspace-view");
const form = document.querySelector("#setup-form");
const loginForm = document.querySelector("#login-form");
const message = document.querySelector("#form-message");
const submitButton = document.querySelector("#setup-submit");
const workspaceSummary = document.querySelector("#workspace-summary");
const loginMessage = document.querySelector("#login-message");

const randomId = () => crypto.randomUUID();

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, passwordKey, 256);
  const encode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return `pbkdf2-sha256$600000$${encode(salt)}$${encode(bits)}`;
}

async function passwordMatches(password, storedValue) {
  const [algorithm, iterations, encodedSalt, expected] = storedValue.split("$");
  if (algorithm !== "pbkdf2-sha256" || !iterations || !encodedSalt || !expected) return false;
  const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const output = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: decode(encodedSalt), iterations: Number(iterations), hash: "SHA-256" }, key, 256));
  const target = decode(expected);
  if (output.length !== target.length) return false;
  return output.reduce((match, byte, index) => match & (byte === target[index] ? 1 : 0), 1) === 1;
}

async function openDatabase() {
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  return Database.load("sqlite:azul.db");
}

function showLogin(companyName) {
  setupView.classList.add("is-hidden");
  workspaceView.classList.add("is-hidden");
  loginView.classList.remove("is-hidden");
  document.querySelector("#login-company").textContent = `Entre para gerir ${companyName} neste computador.`;
}

async function showWorkspace(user, companyName) {
  const database = await openDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const [products, sales, expenses] = await Promise.all([
    database.select("SELECT count(*) AS total FROM products WHERE is_active = 1"),
    database.select(`SELECT count(*) AS total, coalesce(sum(total), 0) AS amount FROM sales WHERE substr(created_at, 1, 10) = '${today}'`),
    database.select(`SELECT coalesce(sum(amount), 0) AS amount FROM expenses WHERE expense_date = '${today}'`)
  ]);
  setupView.classList.add("is-hidden");
  loginView.classList.add("is-hidden");
  workspaceView.classList.remove("is-hidden");
  document.querySelector("#workspace-user").textContent = user.full_name;
  workspaceSummary.textContent = `${companyName} esta a trabalhar com dados guardados apenas neste computador.`;
  document.querySelector("#metric-products").textContent = products[0]?.total ?? 0;
  document.querySelector("#metric-sales").textContent = `${Number(sales[0]?.amount ?? 0).toLocaleString("pt-AO")} Kz`;
  document.querySelector("#metric-sales-count").textContent = `${sales[0]?.total ?? 0} vendas`;
  document.querySelector("#metric-expenses").textContent = `${Number(expenses[0]?.amount ?? 0).toLocaleString("pt-AO")} Kz`;
}

async function loadInstallation() {
  try {
    const database = await openDatabase();
    const rows = await database.select("SELECT value FROM app_settings WHERE key = 'company_name'");
    if (rows[0]?.value) showLogin(rows[0].value);
  } catch {
    // The browser preview has no native SQLite access. The installed desktop app does.
    message.textContent = "Pre-visualizacao aberta. A base local sera criada na aplicacao Windows.";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const companyName = data.get("companyName").trim();
  const companyNif = data.get("companyNif").trim();
  const adminName = data.get("adminName").trim();
  const adminUsername = data.get("adminUsername").trim().toLowerCase();
  const adminPassword = data.get("adminPassword");

  submitButton.disabled = true;
  message.textContent = "A proteger e guardar os seus dados locais...";

  try {
    const password = await passwordHash(adminPassword);
    const database = await openDatabase();
    const settings = [
      ["company_name", companyName],
      ["company_nif", companyNif],
      ["setup_completed_at", new Date().toISOString()]
    ];

    await database.execute("BEGIN IMMEDIATE");
    for (const [key, value] of settings) {
      await database.execute(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('${escapeSql(key)}', '${escapeSql(value)}', CURRENT_TIMESTAMP)`);
    }
    await database.execute(`INSERT INTO local_users (id, full_name, username, password_hash, role) VALUES ('${randomId()}', '${escapeSql(adminName)}', '${escapeSql(adminUsername)}', '${escapeSql(password)}', 'administrator')`);
    await database.execute("COMMIT");
    showLogin(companyName);
  } catch (error) {
    try {
      const database = await openDatabase();
      await database.execute("ROLLBACK");
    } catch { /* no transaction was opened */ }
    message.textContent = "Nao foi possivel criar a empresa. Confirme o nome de utilizador e tente novamente.";
    submitButton.disabled = false;
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const username = document.querySelector("#login-username").value.trim().toLowerCase();
  const password = document.querySelector("#login-password").value;
  const loginButton = document.querySelector("#login-submit");
  loginButton.disabled = true;
  loginMessage.textContent = "A verificar acesso local...";
  try {
    const database = await openDatabase();
    const users = await database.select(`SELECT id, full_name, password_hash FROM local_users WHERE username = '${escapeSql(username)}' AND is_active = 1 LIMIT 1`);
    if (!users[0] || !(await passwordMatches(password, users[0].password_hash))) throw new Error("invalid-login");
    const company = await database.select("SELECT value FROM app_settings WHERE key = 'company_name'");
    document.querySelector("#login-password").value = "";
    await showWorkspace(users[0], company[0]?.value ?? "a sua empresa");
  } catch {
    loginMessage.textContent = "Nome de utilizador ou palavra-passe incorretos.";
    loginButton.disabled = false;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  const database = await openDatabase();
  const company = await database.select("SELECT value FROM app_settings WHERE key = 'company_name'");
  loginForm.reset();
  loginMessage.textContent = "Sessao local terminada.";
  showLogin(company[0]?.value ?? "a sua empresa");
});

loadInstallation();
