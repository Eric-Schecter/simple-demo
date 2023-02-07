import { Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { Model } from "../../types";
import { Instance } from "./instance";

export class Gear extends Instance{
  constructor(url:string,intersectableObjs:Group,cb:(obj:Object3D)=>void){
    super();
    const loader= new STLLoader();
    loader.loadAsync(url)
      .then(geometry => {
        const material = new MeshStandardMaterial({ color: 0x222 });
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.rescale(mesh);
        mesh.position.y += 0.5;
        mesh.name = Model.GEAR.toString();
        cb(mesh);
        intersectableObjs.add(mesh)
    })
    .catch(error => console.log(error))
  }
}