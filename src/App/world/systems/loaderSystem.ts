import { Group, Mesh, MeshStandardMaterial, Object3D, ShaderMaterial } from "three";
import { Model, Render } from "../../types";
import { SelectionSystem } from "./selectionSystem";
import { Robot,Chair,Gear,Workpiece } from "../models";
import { InputSystem } from "./inputSystem";

export class LoaderSystem {
  private renderMode: Render = Render.STD;
  constructor(private intersectableObjs:Group,private selectionSystem:SelectionSystem){}
  private clearScene = (mode: Model) => {
    let res = false;
    this.intersectableObjs.children.forEach(obj => {
      if (obj.name !== mode.toString()) {
        obj.visible = false;
      } else {
        obj.visible = true;
        obj.traverseVisible(o => this.setRenderMode(o));
        res = true;
      }
    })
    return res;
  }
  // just consider standard material and shader material for now
  private setRenderMode = (o: Object3D) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
      if(this.renderMode === Render.WIREShader){
        o.visible = false;
      }else{
        o.visible = true;
        switch (this.renderMode) {
          case Render.STD: {
            o.material.wireframe = false;
            break;
          }
          case Render.WIRE: {
            o.material.wireframe = true;
            break;
          }
          default: { }
        }
      }
    } else if (o instanceof Mesh && o.material instanceof ShaderMaterial) {
      if(this.renderMode === Render.WIREShader){
        o.visible = true;
      }else{
        o.visible = false;
      }
    }
  }
  public changeRenderMode = (mode: Render) => {
    this.selectionSystem.initSelection();
    this.renderMode = mode;
    const targets = Object.values(Model).filter(s => typeof s === 'number');
    this.intersectableObjs.children.forEach(obj => {
      if (targets.includes(parseInt(obj.name))) {
        obj.traverse(o => this.setRenderMode(o));
      }
    })
  }
  public loadModel = (mode: Model,inputSystem?:InputSystem) =>{
    const res = this.clearScene(mode);
    if (!res) {
      switch (mode) {
        case Model.ROBOT: { 
          new Robot(
            'models/RobotExpressive/RobotExpressive.glb',
            this.intersectableObjs,
            this.setRenderMode,
            inputSystem
          ); 
          break; 
        }
        case Model.CHAIR: { 
          new Chair(
            'models/chair.glb',
            this.intersectableObjs,
            this.setRenderMode
          ); 
            break; 
          }
        case Model.GEAR: { 
          new Gear(
            'models/7-PMI.stl',
            this.intersectableObjs,
            this.setRenderMode
          ); 
          break; 
          }
        case Model.WORKPIECE: { 
          new Workpiece(
            'models/1_7M.stp',
            this.intersectableObjs,
            this.setRenderMode
          ); 
          break; 
        }
        default: {
          console.log('something wrong happened');
        }
      }
    }
  }
}