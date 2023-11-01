import { parseCommand } from "../utils/text.js"
import CommandRunner from "./CommandRunner.js"

const log = console.log

class CommandExecutor {
  appState
  commandRunner
  
  // TODO synonyms
  COMMANDS_MAP = {
    m: () => this.commandRunner.modules(),
    // module git stats
    mstat: () => this.commandRunner.moduleStats(),
    // workbranch
    wb: () => this.commandRunner.allToDefaultBranch(),
    // wb + pull
    // TODO params soft - только те что на деве и нормально на него переносятся
    // TODO params pull - просто везде делает pull
    // TODO по дефолту сбрасывает если где-то есть незакомиченные файлы
    sync: (params) => this.commandRunner.syncModules(params),
    wpstart: (params) => this.commandRunner.webpackStart(params),
    wprestart: (params) => this.commandRunner.webpackRestart(params),
    help: () => this.commandRunner.help(),
    clearnodejs: () => this.commandRunner.clearNodeJs()
  }

  constructor(appState) {
    this.appState = appState
    this.commandRunner = new CommandRunner(appState)
  }

  executeCommand = (line) => {
    const { command, params } = parseCommand(line)
    if (typeof this.COMMANDS_MAP[command] === 'function') this.COMMANDS_MAP[command.toLowerCase()](params)
    else {
      log(`Такой комманды нет. Список команд:`)
      log(Object.keys(this.COMMANDS_MAP).join('  '))
    }

  }
}

export default CommandExecutor
