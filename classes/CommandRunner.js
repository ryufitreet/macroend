import chalk from "chalk";
import { format, parse } from "date-fns";
import { exec } from 'child_process' 
import {
  collectLogGitStatsSimpleString,
  getGitStats,
  getMaxLengthBrahcnAndName,
  gitToBranch,
  gitUntrackedFilesFromRaw,
  pull,
} from "../utils/git.js";
import SETTINGS from "../settings.js";
import { endOfCommandOutput, printColumns } from "../utils/console.js";
import { WEBPACK_STATUS } from "../const/webpackStatuses.js";

const log = console.log;

class CommandRunner {
  appState;

  constructor(appState) {
    this.appState = appState;
  }

  modules = async () => {
    const modules = await this.appState.getMicromodules();
    log(modules);
  };

  moduleStats = async (params = {}) => {
    const modules = await this.appState.getMicromodules();
    const collect = [];
    for (const module of modules) {
      const gitStats = getGitStats(module.path);
      // TODO !!! list of untracked files
      collect.push({ module, gitStats });
    }

    if (params["-pipe"] == null) {
      // todo move to utils or somewhere
      printColumns(collect.map((it) => {
        const { filesInWork } = it.gitStats
        // todo нужно сразу запихивать в гитстат то что там лежит
        const filesArr = gitUntrackedFilesFromRaw(it.gitStats.filesInWork)
        const filesListStr = filesArr.length > 0
          ? `(${filesArr.length}) ${filesArr.join(';')}`
          : ''

        return {
          name: it.module.name,
          branch: it.gitStats.branch,
          filesInWork: filesListStr,
          lastCommitDate: format(new Date(+it.gitStats.lastCommitDate * 1000), 'dd.MM.yyyy HH:mm'),
          webpackStatus: it.module.webServerStatus ?? ''
        }
      }), {
        colorFuncs: {
          branch: (v) => v === SETTINGS.DEFAULT_BRANCH ? chalk.green : chalk.red,
          filesInWork: (v) => chalk.red, 
          lastCommitDate: (v) => chalk.gray,
          webpackStatus: (v) => {
            let colorf = (x) => x
            if (v === WEBPACK_STATUS.CRASH) colorf = chalk.red
            else if (v === WEBPACK_STATUS.LIVE) colorf = chalk.green
            return colorf
          }
        }
      })
    }

    return collect;
  };

  allToDefaultBranch = async (params = {}) => {
    const modules = await this.appState.getMicromodules();
    const collectErrors = [];
    const collectToDev = [];
    const collectOK = [];
    for (const module of modules) {
      const gitStats = getGitStats(module.path);
      // TODO rewrite condition
      // TODO точно ли если есть файлы то не переводить
      if (
        gitStats.branch === SETTINGS.DEFAULT_BRANCH &&
        gitStats.filesInWork === ""
      ) {
        collectOK.push({ module, gitStats });
      } else if (gitStats.filesInWork === "") {
        collectToDev.push({ module, gitStats });
      } else {
        collectErrors.push({ module, gitStats });
      }
    }

    if (collectToDev.length > 0) {
      for (const c of collectToDev) {
        const { module } = c;
        gitToBranch(module.path, SETTINGS.DEFAULT_BRANCH);
      }
    }

    if (collectErrors.length > 0) {
      log(`${chalk.red("НЕ ПЕРЕВЕДЕНЫ НА ДЕВ: ВИСЯТ ФАЙЛЫ. ПОПРАВЬ РУКАМИ:")}`);
      for (const errModule of collectErrors) {
        const { gitStats } = errModule;
        const untrackedFiles = (
          gitUntrackedFilesFromRaw(gitStats.filesInWork) ?? []
        ).length;
        log(`    ${errModule.module.name} Files: ${untrackedFiles}`);
      }
      return false
    }
    endOfCommandOutput()
    return true
  };

  // TODO при выполнении писать строку а потом ее переписывать
  syncModules = async (params) => {
    const stats = await this.moduleStats({ "-pipe": 1 });
    if (params["-soft"] != null) {
      // !! Ошибки во время пула
      for (let { module, gitStats } of stats) {
        if (gitStats.branch === SETTINGS.DEFAULT_BRANCH) {
          log(`Pull ${module.name}: dev`);
          try {
            pull(module.path, gitStats.branch);
            log(`${chalk.green("OK")}`);
          } catch(e) {
            log(e)
            break;
          }
        }
      }
      endOfCommandOutput();
    } else if (params["-pull"] != null) {
      for (let { module, gitStats } of stats) {
        log(`Pull ${module.name}: ${gitStats.branch}`);
        try {
          pull(module.path, gitStats.branch);
          log(`${chalk.green("OK")}`);
        } catch(e) {
          log(e)
          break;
        }
      }
      endOfCommandOutput()
    } else if (params["-full"]) {
      const hasErrors = !(await this.allToDefaultBranch())
      if (!hasErrors) {
        this.syncModules({ '-pull': 1 })
      }
      endOfCommandOutput()
    }
  };

  /* Стартует вебпак веб сервер. 
   Очень экспериментальная фича
   -m - список модулей
   -g - группу модулей из SETTINGS
   -m и -g работают вместе
  */
  webpackStart = async (params) => {
    const modulesToStart = []
    if (params['-m'] != null) {
      const modules = await this.appState.findModulesByNames(params['-m']) ?? []
      if (modules.length) {
        modulesToStart.push(...modules)
      } else {
        log(chalk.red('Модули не найдены'))
      }
    }
    if (params['-g'] != null) {
      const list = SETTINGS.MODULE_GROUPS[params['-g']]
      if (list != null) {
        const groupModules = await this.appState.findModulesByNames(list)
        modulesToStart.push(...groupModules)
      } else {
        log(chalk.red('Не найдена такая группа модулей'))
      }
    }
    for (const m of modulesToStart) {
      log(`Start ${m.name}`)
      m.setWebpackServerStatus(WEBPACK_STATUS.STARTED)
      const proc = exec(`cd ${m.path} && ${SETTINGS.RUN_WEBPACK_COMMAND}`, null, (err, stdin, stdout) => {
        m.setWebpackServerStatus(WEBPACK_STATUS.CRASH)
      })
      if (proc != null) {
        m.setWebpackServerStatus(WEBPACK_STATUS.LIVE)
        m.setWebpackPid(proc?.pid)
      }
    }
  };

  /*
    -a - все запущенные
    -m список модулей
  */
  webpackRestart = async (params) => {
    if (params['-a'] == null && params['-m'] == null) {
      log('Как запускать? Есть все (-a) и список модулей (-m)')
      return
    }
    const modules = await this.appState.getMicromodules()
    const wpRunned = modules.filter((it) => {
      return it.webServerStatus != null
    })
    if (!wpRunned.length) {
      log('Ничего не запущено. До свидания.')
      return
    }

    const restartModule = (m) => {
      exec(`taskkill /F /T /PID ${m.webpackPid}`, null, () => {
        m.setWebpackServerStatus(null)
        this.webpackStart({'-m': [m.name]})
      })
    }

    if (params['-a'] != null) {
      for (const m of wpRunned) {
        restartModule(m)
      }
    } else if (params['-m'] != null) {
      for (const m of params['-m']) {
        const module = wpRunned.find((it) => {
          return it.name === m
        })
        if (module != null) {
          restartModule(module)
        } else {
          log(chalk.red(`${m} не запущен`))
        }
      }
    }

  }

  switchProject = async (params) => {
    if (!Array.isArray(params['-p'])) {
      log('Введите название проекта через -p')
    }
    const proj = params['-p'][0]
    if (proj != null) {
      const hasInSettings = Object.keys(SETTINGS.PROJECTS_TO_SWITCH).find((it) => {
        return it === proj
      })
      if (!hasInSettings) {
        log('Проект не найден')
        return
      }
      for (let rule of SETTINGS.PROJECTS_TO_SWITCH[proj]) {
        const { branch, modules } = rule
        const modulesObj = await this.appState.findModulesByNames(modules)
        for (const m of modulesObj) {
          gitToBranch(m.path, branch)
        }
      }
      endOfCommandOutput()
    }
  }

  /* Удаляет все нодовские процессы. Осторожно.
     На тот случай если webpackStart косякнул и что-то не закрылось.
  */
  clearNodeJs = async (params) => {
    log('Эта программа тоже node процесс. Досведание!')
    exec(`taskkill /F /IM node.exe`, null, () => {
      m.setWebpackServerStatus(null)
      this.webpackStart({'-m': [m.name]})
    })
  }

  help = () => {
    log('m - системный список модулей')
    log('mgs - данные по всем модулям')
    log('wb - на рабочую ветку')
    log('sync - перевод на рабочую ветку все модули разом')
    log('    -soft - пулит только то что на рабочей ветке')
    log('    -full - переводит на рабочую ветку и пулит.')
    log('            Если в какой-то репе есть unstaged файлы, то выводит сообщение об этом и ничего не делает')
    log('    -pull - пулит все что есть на своих ветках')
    log('wps - стартует вебпак')
    log('    -m #модуль1# #модуль2# - стартует массив модулей')
    log('    -g #группамодулей# - стартует группу модулей описанную в settings.js')
    log('sp (switch project) - переключает несколько модулей на опр. в настройках ветки')
  }
}

export default CommandRunner;
