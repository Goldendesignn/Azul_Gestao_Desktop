import "./style.css";

const statusElement = document.querySelector("#database-status");

async function checkLocalDatabase() {
  try {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    const database = await Database.load("sqlite:azul.db");
    const rows = await database.select("SELECT value FROM app_settings WHERE key = 'schema_version'");
    const version = rows[0]?.value ?? "1";
    statusElement.textContent = `Base local pronta. Estrutura de dados: versao ${version}.`;
    statusElement.dataset.ready = "true";
  } catch (error) {
    // Browsers used for visual design do not have the native Tauri runtime.
    statusElement.textContent = "Versao de demonstracao. A base local sera ativada na aplicacao Windows.";
    statusElement.dataset.ready = "false";
  }
}

checkLocalDatabase();
