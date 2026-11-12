use tauri_plugin_sql::{Migration, MigrationKind};

const MIGRATIONS: [Migration; 1] = [Migration {
    version: 1,
    description: "create_base_schema",
    sql: include_str!("../migrations/0001_create_base_schema.sql"),
    kind: MigrationKind::Up,
}];

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:azul.db", MIGRATIONS.to_vec())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running Azul Gestao Desktop");
}
