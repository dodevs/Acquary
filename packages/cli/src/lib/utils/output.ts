import * as Path from "path";
import * as process from "process";
import * as fs from 'fs';
import { Readable } from 'stream';
import * as XLSX from "xlsx";
import {utils, WorkBook, WorkSheet} from "xlsx";
import {KeyValue, saveJson} from "./json";

const workbookClients: KeyValue<WorkSheet> = {};
const jsonClients: KeyValue<unknown> = {};
const streamClients = new Readable({ read() {  }});
streamClients.pipe(process.stdout);

const Json = {
  add: (value: unknown[], client: string) => {
    jsonClients[client] = value;
  },
  save: () => saveJson(Path.resolve(process.cwd(), 'result.json'), jsonClients),
}

const Xls = {
  add: (value: unknown[], client: string) => {

    if (Output.unique) {
      const rows = value.map(row => Object.assign({}, {Cliente: client}, row));
      if (!workbookClients['default']) {
        workbookClients['default'] = utils.json_to_sheet([]);
        utils.sheet_add_json(workbookClients['default'], rows,{skipHeader: false});
      } else {
        utils.sheet_add_json(workbookClients['default'], rows,{skipHeader: true, origin: -1});
      }
    } else {
      client = client.replace('AevoInnovate', '').slice(0, 31)
      workbookClients[client] = utils.json_to_sheet(value);
    }
  },
  save: () => {
    if (Object.keys(workbookClients).length == 0)
      return;

    const workbook: WorkBook = utils.book_new();
    Object.keys(workbookClients).forEach(client => {
      utils.book_append_sheet(workbook, workbookClients[client], client);
    });
    XLSX.set_fs(fs);
    XLSX.writeFile(workbook, Path.resolve(process.cwd(), 'result.xlsx'));
  }
}

const Stdout = {
  add: (value: unknown[]) => {
    streamClients.push(JSON.stringify(value) + '\n');
  },
  save: () => {
    streamClients.push(null);
  }
}

const OutputActions = new Map<string, {add: (value: unknown[], client: string) => void, save: () => void}>([
  ['json', Json],
  ['xls', Xls],
  ['stdout', Stdout]
]);

export const Output = {
  format: 'json',
  empty: false,
  unique: false,
  add: (value: unknown[], client: string) => {
    if (!Output.empty && (!value || (Array.isArray(value) && value.length == 0)))
      return;
    OutputActions.get(Output.format)?.add(value, client);
  },
  save: () => {
    OutputActions.get(Output.format)?.save();
  }
}
