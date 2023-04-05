import { Command, Argument } from "commander";
import { Templates, Types, TypesList } from "./templates";
import * as fs from "fs";

export const GenerateCommand = () => {
  const command = new Command();
  command
    .name('generate')
    .description('Generate a config files and scripts')
    .addArgument(
      new Argument('<type>', 'Type of the file to generate')
        .choices(TypesList)
        .argRequired()
    )
    .addArgument(
      new Argument('<name>', 'Name of the file to generate')
        .argRequired()
    )
    .action((type: Types, name: string) => {
      const template = Templates[type];
      try{
        fs.writeFileSync(name, template, "utf8");
      } catch (e) {
        console.error(`Error generating file ${name}: ${e}`);
      }
    });

  return command;
}
