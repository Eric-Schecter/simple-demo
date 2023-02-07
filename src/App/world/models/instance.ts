import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, ShaderMaterial, Vector3 } from "three";
import { Render } from "../../types";

export abstract class Instance {
  // just consider standard material and shader material for now
  protected setRenderMode = (o:Object3D,renderMode:Render) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
      if(renderMode === Render.WIREShader){
        o.visible = false;
      }else{
        o.visible = true;
        switch (renderMode) {
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
      if(renderMode === Render.WIREShader){
        o.visible = true;
      }else{
        o.visible = false;
      }
    }
  }
  protected rescale = (group: Group | Mesh) => {
    const boudingBox = new Box3();
    boudingBox.setFromObject(group);
    const vec = new Vector3();
    boudingBox.getSize(vec);
    const scaleRatio = Math.max(vec.x, vec.y, vec.z);
    vec.multiplyScalar(1 / scaleRatio);
    group.scale.multiplyScalar(1 / scaleRatio);
    return vec;
  }
}