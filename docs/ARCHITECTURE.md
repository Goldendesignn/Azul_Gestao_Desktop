# Architecture decision: local first

## Data ownership

Every Azul Desktop installation has an independent SQLite database. The system does not need a cloud account or a permanent Internet connection to read or write business data.

## Protection

The first production release must include:

1. A local administrator created during first use.
2. Passwords stored only as strong password hashes, never plain text.
3. Automatic rotating encrypted backup archive, plus a manual backup button.
4. Restore validation before replacing the active database.
5. Immutable audit entries for critical changes such as sale cancellation, price changes and restores.

## Migration from online Azul

An import assistant will export data from Supabase while it is still available, validate it locally, show a summary, and only then write it into SQLite in one transaction. The local application will never delete online data during import.

## Future synchronization

Synchronization with another PC or a cloud backup can be offered later, but it will be opt-in. The local database remains the source of truth for an offline business.
