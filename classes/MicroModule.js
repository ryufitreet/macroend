class MicroModule {
  path
  name
  webServerStatus
  webpackPid

  constructor (initData) {
    this.path = initData.path
    this.name = initData.name
  }

  setWebpackServerStatus(status) {
    this.webServerStatus = status
  }
  setWebpackPid(pid) {
    this.webpackPid = pid 
  }
}

export default MicroModule
