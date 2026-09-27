# Plain SQL over Neon's HTTP driver, tested against PGlite

The app's own data is two tables with simple queries, so it uses plain SQL through Neon's serverless HTTP driver instead of an ORM such as Drizzle, the same approach as the print calculator. Tests run that SQL against PGlite, an in-process Postgres, so query mistakes are caught without a network connection or a Neon account.
