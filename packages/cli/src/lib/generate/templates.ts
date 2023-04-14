export const TypesList = ['script', 'clients'] as const;
export type Types = typeof TypesList[number];

const ScriptTemplate = `
exports.default = async function (transaction, client) {
  const request = new Request(transaction);
  const query = await request.query(\`
    SELECT
      'Hello World' AS [Hello World]
  \`);
  return query.recordset;
}
`

const ClientsTemplate = `
  {
    "type": "list OR query",
    "list": [
      "Database1",
      "Database2",
    ],
    "database": "ClientsDatabase",
    "query": "SELECT DatabaseName FROM ClientsTable"
  }
`;

type Template = {
  [key in Types]: string;
}

export const Templates: Template = {
  'script': ScriptTemplate,
  'clients': ClientsTemplate
}
