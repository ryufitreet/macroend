import AppState from "./classes/AppState.js";
import CommandExecutor from "./classes/CommandExecutor.js";
import readline from 'readline'

const appState = new AppState()
const commandExecutor = new CommandExecutor(appState)

const start = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.write('добро пожаловат\n')

  rl.on('line', (input) => {
    commandExecutor.executeCommand(input)
  })
}

process.on('uncaughtException', function (err) {
  console.error(err.stack);
});

start()
