import { Group, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Model } from "../../types";
import { Instance } from "./instance";

export class Chair extends Instance{
  constructor(url:string,intersectableObjs:Group,cb:(obj:Object3D)=>void){
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
        obj.scene.rotateY(Math.PI);
        obj.scene.name = Model.CHAIR.toString();
        intersectableObjs.add(obj.scene);
      })
      .catch(error => console.log(error))
  }
}