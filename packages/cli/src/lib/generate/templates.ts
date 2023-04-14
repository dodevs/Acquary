export const TypesList = ['script', 'clients', 'postprocess'] as const;
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

const PostprocessTemplate = `
  import sys
  import json

  qtdTotal = 0

  for client in sys.stdin:
      result = json.loads(client)
      qtd = result[0]['Qtd']
      qtdTotal += qtd
      print(f'Qtd : {qtd}')


  print(f'Qtd total : {qtdTotal}')
  print("Exit")
`;

type Template = {
  [key in Types]: string;
}

export const Templates: Template = {
  'script': ScriptTemplate,
  'clients': ClientsTemplate,
  'postprocess': PostprocessTemplate
}
