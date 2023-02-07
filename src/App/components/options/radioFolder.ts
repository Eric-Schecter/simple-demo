import { GUI } from "dat.gui";
import { Option, Options } from "./types";


export class RadioFolder {
  private folder:GUI;
  constructor(gui:GUI,options:Options,key:string,cb:(...args:any)=>void){
    this.folder = gui.addFolder(options[key].folderName)
    for(const subKey in options[key].settings){
      this.addRatioItem(options[key],subKey,cb);
      this.callWhenInit(options[key],subKey,cb);
    }
    this.folder.open();
  }
  private callWhenInit = (option:Option,subKey:string,cb:(...args:any)=>void) =>{
    if(option.settings[subKey]){
      cb(option.values[subKey]);
    }
  }
  protected addRatioItem = (options:Option,key:string,cb:(...args:any)=>void) =>{
    this.folder
      .add(options.settings, key)
      .name(key)
      .listen()
      .onChange((value: boolean) => {
        if (!value) { return; }
        this.disableOthers(options.settings, key);
        cb(options.values[key]);
      });
  }
  private disableOthers = (options: { [prop: string]: boolean }, target: string) => {
    for (const key in options) {
      options[key] = key === target;
    }
  }
}