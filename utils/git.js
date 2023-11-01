import { execSync } from "child_process";
import chalk from "chalk";

import SETTINGS from "../settings.js";
import { formatColumnCellOutput, getMaxLength } from "./text.js";

// TODO transfer to system
const runCommandSync = (cmd, options) => {
  return execSync(cmd, { encoding: "utf8", ...options });
};

export const getGitStats = (path) => {
  const branch = (
    runCommandSync(`cd ${path} && git branch --show-current`) ?? ""
  ).trim();
  const filesInWork = runCommandSync(`cd ${path} && git status -s`);
  const lastCommitDate = runCommandSync(`cd ${path} && git log -1 --format="%at"`)
  return { branch, filesInWork, lastCommitDate };
};

// return array of string
export const gitUntrackedFilesFromRaw = (string) => {
  const files = string.split("\n").filter((it) => it.length > 0);
  return files.map((it) => {
    const f = it.trim().split(" ");
    if (f.length > 0) f.shift();
    return f.filter((it) => it.length > 0).join(" ");
  });
};

export const gitToDefaultBranch = (path) => {
  runCommandSync(`cd ${path} && git switch ${SETTINGS.DEFAULT_BRANCH}`, { stdio : 'pipe' });
  const filesInWork = runCommandSync(`cd ${path} && git status -s`);
  const branch = (runCommandSync(`cd ${path} && git branch --show-current`) ?? "").trim();
  return { branch, filesInWork };
};

export const collectLogGitStatsSimpleString = (
  m,
  maxLengthName,
  maxLengthBranch
) => {
  const { module, gitStats } = m;
  

  const branchColorF =
    gitStats.branch === SETTINGS.DEFAULT_BRANCH ? chalk.green : chalk.red;
  let branch = branchColorF(
    formatColumnCellOutput(gitStats.branch, maxLengthBranch)
  );

  const name = formatColumnCellOutput(module.name, maxLengthName);

  const filesList = gitUntrackedFilesFromRaw(gitStats.filesInWork);
  const files = `(${filesList.length}) ${formatColumnCellOutput(
    filesList.join(";"),
    50
  )}`;
  const resultString = `${name} ${branch} ${
    filesList.length > 0 ? files : ""
  } \n`;
  return resultString;
};

// list of GITSTATRESULT
export const getMaxLengthBrahcnAndName = (list) => {
  const maxLengthName = getMaxLength(list.map((it) => it.module.name));
  const maxLengthBranch = getMaxLength(list.map((it) => it.gitStats.branch));
  return { maxLengthName, maxLengthBranch };
};

export const pull = (path, branch) => {
  runCommandSync(`cd ${path} && git pull origin ${branch}`, { stdio: 'pipe' })
}
