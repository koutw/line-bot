const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const localSchemaPath = path.join(__dirname, '../prisma/schema.local.prisma');

console.log('Generating local Prisma schema...');

try {
  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Replace datasource block for SQLite
  // Looks for:
  // datasource db {
  //   provider = "postgresql"
  //   url      = env("DATABASE_URL")
  // }

  // We use a regex to replace the entire datasource block or specific fields
  // Ideally, we just want to force provider = "sqlite" and url = "file:./dev.db"

  const sqliteDatasource = `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}`;

  // Regex to match the datasource block. 
  // Matches "datasource db {" followed by anything until the closing "}"
  const datasourceRegex = /datasource\s+db\s+\{[\s\S]*?\}/;

  if (datasourceRegex.test(schema)) {
    schema = schema.replace(datasourceRegex, sqliteDatasource);
    fs.writeFileSync(localSchemaPath, schema);
    console.log(`Successfully generated ${localSchemaPath}`);
    console.log('Provider switched to: sqlite');
    console.log('URL switched to: file:./dev.db');
  } else {
    console.error('Error: Could not find "datasource db { ... }" block in schema.prisma');
    process.exit(1);
  }

} catch (error) {
  console.error('Error generating local schema:', error);
  process.exit(1);
}
