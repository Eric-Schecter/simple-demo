import { PerspectiveCamera, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class CameraSystem {
  public camera: PerspectiveCamera;
  public control: OrbitControls;
  constructor(renderer:WebGLRenderer,width:number,height:number){
    this.camera = this.initCamera(width / height);
    this.control = this.initControl(renderer);
  }
  private initControl = (renderer:WebGLRenderer) => {
    const control = new OrbitControls(this.camera, renderer.domElement);
    control.maxDistance = 50;
    control.minDistance = 0.1;
    control.enableDamping = true;
    control.target.set(0, 0.5, 0);
    return control;
  }
  private initCamera = (aspect: number) => {
    const camera = new PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(0, 2, 4);
    return camera;
  }
}