import { Group, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Model } from "../../types";
import { InputSystem } from "../systems";
import { Instance } from "./instance";

export class Robot extends Instance{
  constructor(url:string,intersectableObjs:Group,cb:(obj:Object3D)=>void,inputSystem?:InputSystem){
    super();
    const loader = new GLTFLoader();
    loader.loadAsync(url)
      .then(obj => {
        obj.scene.traverse(o => {
          o.castShadow = true;
          o.receiveShadow = true;
          cb(o);
        })
        this.rescale(obj.scene);
        obj.scene.name = Model.ROBOT.toString();
        inputSystem?.dispose();
        inputSystem?.setup(obj);
        intersectableObjs.add(obj.scene);
      })
      .catch(error => console.log(error))
  }
}