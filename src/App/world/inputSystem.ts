import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationSystem } from './animationSystem';
import { PhysicsSystem } from './physicsSystem';

export class InputSystem {
  private animationSystem?:AnimationSystem;
  private physicsSystem?:PhysicsSystem;
  constructor(private control:OrbitControls){}
  public setup = (gltf:GLTF) =>{
    this.animationSystem = new AnimationSystem(gltf);
    this.physicsSystem = new PhysicsSystem(gltf.scene);
    window.addEventListener('keydown',this.keydown);
    window.addEventListener('keyup',this.keyup);
  }
  private keyup = (e:KeyboardEvent)=>{
    if(!this.animationSystem || !this.physicsSystem){
      return;
    }
    if(e.key==='k'){
      this.physicsSystem.force = 0.005;
      this.animationSystem.isRunmode = false; 
    }else {
      this.physicsSystem.unregister(e.key);
    }
  }
  private keydown = (e:KeyboardEvent) =>{
    if(!this.animationSystem || !this.physicsSystem){
      return;
    }
    if(e.key==='k'){
      this.physicsSystem.force = 0.01;
      this.animationSystem.isRunmode = true; 
    }else if(e.key!==this.physicsSystem?.currentKey){
      this.physicsSystem.register(e.key);
    }
  }
  public update = (time:number) =>{
    if(!this.animationSystem || !this.physicsSystem){
      return;
    }
    this.physicsSystem?.update();
    this.animationSystem?.update(time,this.physicsSystem.currentKey,this.physicsSystem.velocity.lengthSq());
  }
  public dispose = () =>{
    window.removeEventListener('keydown',this.keydown);
    window.removeEventListener('keyup',this.keyup);
  }
}