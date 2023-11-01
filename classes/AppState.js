import { getMicroModules } from "../files.js";
import SETTINGS from "../settings.js";
import MicroModule from "./MicroModule.js";

class AppState {
  _microModules = null;

  scanAndSetFrontendModules = async () => {
    this._microModules = (await getMicroModules(
      SETTINGS.MICROFRONTEND_DIRECTORY
    )).map((it) => new MicroModule(it));
  };

  getMicromodules = async () => {
    if (this._microModules === null) await this.scanAndSetFrontendModules();
    return this._microModules;
  };

  findModulesByNames = async (list) => {
    const modules = await this.getMicromodules()
    return modules.filter(({ name }) => list.includes(name))
  }
}

export default AppState;
