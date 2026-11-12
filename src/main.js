import "./style.css";

const setupView = document.querySelector("#setup-view");
const workspaceView = document.querySelector("#workspace-view");
const form = document.querySelector("#setup-form");
const message = document.querySelector("#form-message");
const submitButton = document.querySelector("#setup-submit");
const workspaceSummary = document.querySelector("#workspace-summary");

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

async function openDatabase() {
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  return Database.load("sqlite:azul.db");
}

function showWorkspace(companyName) {
  setupView.classList.add("is-hidden");
  workspaceView.classList.remove("is-hidden");
  workspaceSummary.textContent = `${companyName} ja tem a sua base local preparada.`;
}

async function loadInstallation() {
  try {
    const database = await openDatabase();
    const rows = await database.select("SELECT value FROM app_settings WHERE key = 'company_name'");
    if (rows[0]?.value) showWorkspace(rows[0].value);
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
    showWorkspace(companyName);
  } catch (error) {
    try {
      const database = await openDatabase();
      await database.execute("ROLLBACK");
    } catch { /* no transaction was opened */ }
    message.textContent = "Nao foi possivel criar a empresa. Confirme o nome de utilizador e tente novamente.";
    submitButton.disabled = false;
  }
});

loadInstallation();
