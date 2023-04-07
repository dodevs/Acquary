# Acquary CLI

## Installation

To install, just run the command below:

```bash
npm install -g @acquary/cli
```

## Usage

### ENV

First, you need to configure an _ENV_, that is a folder with a `config.json` file for azure databases server and
a `.cache.json` file for caching MFA tokens.

You can configure multiple ENVs, and switch between them using the `--env` flag.

```bash
acquary configure --add prod
```

This will create a `prod` folder in the `<HOME>/.acquary` folder, and you should edit the `config.json` file to add your configuration.\
For `azure_server` section, see more information [here](https://tediousjs.github.io/tedious/api-connection.html).\
For `azure_authentication`, you only need to edit the `authority`. The `clientId` and `clientSecret` are from Azure Data Studio hehe.

#### Parameters

`--add` - Add a new ENV\
`--remove` - Remove a ENV\
`--list` - List all ENVs\
`--test` - Test a ENV connection\
`--logout` - Logout from a ENV (Only for MFA)

### Generate

You need to generate a `clients.json` file to use the CLI. This is a file that contains all the
databases you want to connect to or a SQL Query to get the databases.

```bash
acquary generate clients clients.json
```

#### Arguments
```bash
acquary generate <type> <file>
```
Where `type` can be `clients`or `script`

### Execute

After create a _ENV_ and generate a file with the `databases` configuration, you can execute a script against all the databases.

```bash
acquary execute --env prod --clients clients.json --query "SELECT * FROM SomeTable"
```

#### Parameters
`--e, --env` - The ENV to use\
`--c, --clients` - The clients file\
`--q, --query` - The SQL Query to execute\
`--f, --file` - The SQL File to execute\
`--s, --script` - The javascript file to execute. [See more](#Script)\
`--o, --output` - The output format. Can be `json`, `xls` or `stdout`. [See more](#Stdout)\
`--empty` - If the output should contain empty results\
`--unique` - If the _xls_ output should contain only one sheet with all the results\
`--mc, --maxConcurrent` - Max concurrent clients\
`--mr, --maxRetries` - Max retries after an error\

#### Script

You can also execute a javascript file that contains a function that will be executed against all the databases. [See more](https://github.com/tediousjs/node-mssql#request)

```javascript
exports.default = async function(request, client) {
    const result = await request.query("SELECT * FROM SomeTable");
    return result.recordset;
}
```

#### Stdout

With the `--output stdout` flag, you can pipe all databases outputs to another command.\
For example, you can pipe the output to `jq` to filter the result.

```bash
acquary execute --env prod --clients clients.json --query "SELECT * FROM SomeTable" --output stdout | jq '.[] | select(.SomeColumn == "SomeValue")'
```

Or to `python`

```python
import sys
import json

for line in sys.stdin:
    print(json.loads(line))
```
