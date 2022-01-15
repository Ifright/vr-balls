export class Controller {
  controller
  renderer

  constructor(renderer, index) {
    if (!renderer) {
      throw Error("Invalid renderer value: " + JSON.stringify(renderer))
    }
    this.renderer = renderer
    this.controller = this.renderer.xr.getController(index)
  }

  handle() {
    throw Error("abstract method")
  }
}