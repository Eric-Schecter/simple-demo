import {
  Mesh, Scene, WebGLRenderer, PlaneBufferGeometry, PerspectiveCamera, TextureLoader,Color,
  MeshPhongMaterial, Vector2, Group, Raycaster, Object3D, Material, MeshStandardMaterial, BufferGeometry, BufferAttribute,
   Box3, Vector3, AmbientLight, SpotLight, sRGBEncoding
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as occtimportjs from 'occt-import-js';
import { Model,Selection } from './types';

export class World {
  private scene: Scene;
  private intersectableObjs:Group;
  private camera: PerspectiveCamera;
  private timer = 0;
  private renderer: WebGLRenderer;
  private texLoader = new TextureLoader();
  private gltfLoader = new GLTFLoader();
  private stlLoader = new STLLoader();
  private control: OrbitControls;
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private target: Object3D | null = null;
  private tempMaterial: Material | null = null;
  private selectedMaterial = new MeshPhongMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
  private isLocked = false;
  constructor(container: HTMLDivElement) {
    const { offsetWidth: width, offsetHeight: height } = container;
    this.renderer = new WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true 
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor('black')
    container.append(this.renderer.domElement);
    this.scene = new Scene();
    this.intersectableObjs = new Group();
    this.scene.add(this.intersectableObjs);

    this.camera = this.initCamera(width / height);
    this.control = this.initControl();
    this.initLights();
    this.initObjs();
  }
  private initControl = () => {
    const control = new OrbitControls(this.camera, this.renderer.domElement);
    control.maxDistance = 50;
    control.minDistance = 0.1;
    control.enableDamping = true;
    control.target.set(0, 0.5, 0);
    return control;
  }
  private initCamera = (aspect: number) => {
    const camera = new PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(0,2,4);
    return camera;
  }
  private rescale = (group:Group | Mesh) =>{
    const boudingBox = new Box3();
    boudingBox.setFromObject(group);
    const vec = new Vector3();
    boudingBox.getSize(vec);
    const scaleRatio = Math.max(vec.x,vec.y,vec.z);
    vec.multiplyScalar(1/scaleRatio);
    group.scale.multiplyScalar(1/scaleRatio);
    return vec;
  }
  private loadModelSTP = (url:string) =>{
    occtimportjs().then(async (occt:any)=>{
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const fileBuffer = new Uint8Array(buffer);
      const result = occt.ReadStepFile(fileBuffer, null);
      const meshes = result.meshes.map((data:any)=>{
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(data.attributes.position.array),3));
        geometry.setAttribute('normal', new BufferAttribute(new Float32Array(data.attributes.normal.array),3));
        geometry.setIndex(new BufferAttribute(new Uint16Array(data.index.array),1));
        const material = new MeshStandardMaterial({color:new Color(data.color[0],data.color[1],data.color[2])});
        const mesh = new Mesh(geometry,material);
        mesh.castShadow = true;
        return mesh;
      })
      const group = new Group();
      group.add(...meshes);
      const vec = this.rescale(group);
      group.translateY(vec.y);
      group.translateX(-vec.z);
      group.scale.multiplyScalar(2);
      group.name = Model.STP.toString();
      this.intersectableObjs.add(group);
      this.isLocked = false;
    })
  }
  private loadModelSTL = (url:string) =>{
    this.stlLoader.loadAsync(url)
      .then(geometry=>{
        const material = new MeshStandardMaterial( { color: 0x222 } );
        const mesh = new Mesh( geometry, material );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.rescale(mesh);
        mesh.position.y +=0.5;
        mesh.name = Model.STL.toString();
        this.intersectableObjs.add(mesh)
      })
      .catch(error=>console.log(error))
      .finally(()=>this.isLocked = false)
  }
  private loadModelGLB = (url: string) => {
    this.gltfLoader.loadAsync(url)
      .then(obj => {
        obj.scene.traverse(o => {
          o.castShadow = true;
          o.receiveShadow = true; 
        })
        this.rescale(obj.scene);
        obj.scene.rotateY(Math.PI);
        obj.scene.name = Model.GLB.toString();
        this.intersectableObjs.add(obj.scene);
      })
      .catch(error => console.log(error))
      .finally(()=>this.isLocked = false);
  }
  private initObjs = () => {
    const planeGeo = new PlaneBufferGeometry(1000, 1000);
    const planeMat = new MeshPhongMaterial({ color: 0xdddddd });
    const plane = new Mesh(planeGeo, planeMat);
    plane.rotateX(-Math.PI / 2);
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  private initSpotLight = (x:number,y:number,z:number,intensity:number) =>{
    const light = new SpotLight('white', intensity);
    light.penumbra = 1;
    light.position.set(x,y,z);
    light.lookAt(0, 0, 0);
    light.shadow.mapSize = new Vector2(1024, 1024);
    light.castShadow = true;
    return light;
  }
  // https://vimeo.com/blog/post/your-quick-and-dirty-guide-to-3-point-lighting
  private initLights = () => {
    const lights = new Group();
    const dis = 4;
    const keyLight = this.initSpotLight(-dis,dis,dis,1);
    const fillLight = this.initSpotLight(dis,dis,dis,0.5);
    const backLight = this.initSpotLight(-dis,dis,-dis,0.2);
    const ambientLight = new AmbientLight('white', 0.1);
    lights.add(ambientLight, keyLight, fillLight, backLight);
    this.scene.add(lights);
  }
  private clearScene = (mode:Model) => {
    let res = false;
    this.intersectableObjs.children.forEach(obj=>{
      if(obj.name!==mode.toString()){
        obj.visible = false;
      }else{
        obj.visible = true;
        res =true;
      }
    })
    return res;
  }
  public loadModel = (mode:Model) =>{
    if(this.isLocked){
      console.log('model is loading')
      return;
    }
    const res = this.clearScene(mode);
    if(!res){
      switch(mode){
        case Model.GLB:{this.loadModelGLB('models/chair.glb');break;}
        case Model.STL:{this.loadModelSTL('models/7-PMI.stl');break;}
        case Model.STP:{this.loadModelSTP('models/1_7M.stp');break;}
        default:{
          console.log('something wrong happened');
        }
      }
    }
  }
  public changeSelectionMode = (mode:Selection) =>{
    
  }
  public draw = () => {
    this.control.update();
    this.renderer.render(this.scene, this.camera);
    this.timer = requestAnimationFrame(this.draw);
  }
  public mousemove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { clientWidth, clientHeight } = this.renderer.domElement;
    this.mouse.set(
      (clientX / clientWidth) * 2 - 1,
      -(clientY / clientHeight) * 2 + 1,
    )
  }
  private restoreMaterial = () => {
    if (this.target && this.tempMaterial) {
      (this.target as Mesh).material = this.tempMaterial;
    }
  }
  public click = () => {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = this.raycaster.intersectObjects(this.intersectableObjs.children,true);
    if (!intersection.length) {
      this.restoreMaterial();
      this.target = null;
      return;
    }
    console.log(intersection)
    const [target] = intersection;
    this.restoreMaterial();
    this.target = target.object;
    this.tempMaterial = (this.target as Mesh).material as Material;
    (this.target as Mesh).material = this.selectedMaterial;
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
  }
}