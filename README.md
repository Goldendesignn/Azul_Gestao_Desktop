# Azul Gestao Desktop

Azul Gestao Desktop is the offline edition of Azul. It keeps the business data on the customer's computer, so sales, purchases, stock and expenses continue to work without an Internet connection.

## Foundation

- Tauri 2 for the Windows application.
- SQLite database stored locally, one database per company installation.
- Versioned database migrations, never automatic data deletion.
- Local backup and restore, with an encrypted archive planned before the first production release.
- Import assistant to copy a business from the online Azul version only when the owner chooses to do so.

## First delivery

1. Local company profile and secure local login.
2. Products, stock, sales, purchases, expenses and receipts.
3. Backup, restore and data export.
4. Optional online synchronization as a separate feature, never a dependency for daily work.

## Development

The workstation needs Node.js, Rust and Microsoft C++ Build Tools before running the desktop build.

```powershell
npm install
npm run tauri dev
```

The installation creates a local SQLite file in the operating system application-data directory. It must not be copied manually while the application is open; use the backup screen instead.
