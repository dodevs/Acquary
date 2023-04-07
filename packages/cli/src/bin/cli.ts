#!/usr/bin/env node

import { Command } from "commander";
import { ExecuteCommand } from "../lib/execute/command";
import { ConfigureCommand } from "../lib/configure/command";
import { GenerateCommand } from "../lib/generate/command";

const program = new Command();

program
  .name('Acquary CLI')
  .description('CLI to manage and execute scripts in azure databases')
  .version('^1');

program.addCommand(ExecuteCommand());
program.addCommand(ConfigureCommand());
program.addCommand(GenerateCommand());

program.parse(process.argv);
