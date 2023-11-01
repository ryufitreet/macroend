import { readdir } from "fs/promises";

import SETTINGS from "./settings.js";

const {
  IGNORE_FOLDERS_IN_ROOT,
  IGNORE_MODULES,
  ALWAYS_IGNORE_FODLERS,
} = SETTINGS

export const getMicroModules = async (searchFolder) => {
  const rootFolders = await getDirectories(
    searchFolder,
    IGNORE_FOLDERS_IN_ROOT
  );

  let result = [];
  for (const f of rootFolders) {
    const path = `${searchFolder}/${f}`;
    const isModule = await isJsModule(path);
    if (isModule) {
      const name =  path.replace(`${SETTINGS.MICROFRONTEND_DIRECTORY}/`, '')
      result.push({ path, name });
    } else {
      const modules = await getMicroModules(path);
      result.push(...modules);
    }
  }

  return result.filter((it) => !IGNORE_MODULES.includes(it.name));
};

const getDirectories = async (path, ignore = []) => {
  return (await readdir(path, { withFileTypes: true }))
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        !ignore.includes(dirent.name) &&
        !ALWAYS_IGNORE_FODLERS.includes(dirent.name)
    )
    .map((dirent) => dirent.name);
};

const isJsModule = async (path) => {
  const packageJson = (await readdir(path, { withFileTypes: true }))
    .filter((dirent) => dirent.isFile())
    .find((f) => f.name === "package.json");
  return !!packageJson;
};

