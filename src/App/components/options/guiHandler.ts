import { GUI } from "dat.gui";
import { World } from "../../world";
import { options } from "./data";
import { RadioFolder } from "./radioFolder";

export class GUIHandler {
  private gui:GUI;
  constructor(container: HTMLDivElement, world: World) {
    this.gui = this.initGUI(container);
    new RadioFolder(this.gui,options,'model',world.loadModel);
    new RadioFolder(this.gui,options,'selectionMode',world.changeSelectionMode);
    new RadioFolder(this.gui,options,'renderMode',world.changeRenderMode);
  }
  private initGUI = (container:HTMLDivElement) =>{
    const gui = new GUI();
    container.appendChild(gui.domElement);
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '0';
    gui.domElement.style.right = '0';
    return gui;
  }
  public dispose = () => {
    this.gui.destroy();
  }
}