import {
  Mesh, Scene, WebGLRenderer, PlaneBufferGeometry, PerspectiveCamera, TextureLoader, Color,
  MeshPhongMaterial, Vector2, Group, Raycaster, Object3D, Material, MeshStandardMaterial, BufferGeometry, BufferAttribute,
  Box3, Vector3, AmbientLight, SpotLight, sRGBEncoding, SphereBufferGeometry, Intersection, Face, Clock,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as occtimportjs from 'occt-import-js';
import { Model, Render, Selection } from '../types';
import { InputSystem } from './inputSystem';

export class World {
  private scene: Scene;
  private intersectableObjs: Group;
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
  private isLocked = false;
  private tempMaterial: Material | null = null;
  private selectedMaterial = new MeshPhongMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
  private selectedPoint: Mesh;
  // private selectedLine:Mesh;
  private selectedFace: Mesh;
  private selectionMode: Selection = Selection.MESH;
  private renderMode: Render = Render.STD;
  private inputSystem?: InputSystem;
  private clock = new Clock();
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
    this.selectedPoint = this.initSelectionPoint();
    // this.selectedLine = this.initSelectionLine();
    this.selectedFace = this.initSelectionFace();
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
    camera.position.set(0, 2, 4);
    return camera;
  }
  private rescale = (group: Group | Mesh) => {
    const boudingBox = new Box3();
    boudingBox.setFromObject(group);
    const vec = new Vector3();
    boudingBox.getSize(vec);
    const scaleRatio = Math.max(vec.x, vec.y, vec.z);
    vec.multiplyScalar(1 / scaleRatio);
    group.scale.multiplyScalar(1 / scaleRatio);
    return vec;
  }
  // current just consider wiether is wireframe or not
  private setRenderMode = (o: Object3D) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
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
  }
  private loadModelSTP = (url: string) => {
    occtimportjs().then(async (occt: any) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const fileBuffer = new Uint8Array(buffer);
      const result = occt.ReadStepFile(fileBuffer, null);
      const meshes = result.meshes.map((data: any) => {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(data.attributes.position.array), 3));
        geometry.setAttribute('normal', new BufferAttribute(new Float32Array(data.attributes.normal.array), 3));
        geometry.setIndex(new BufferAttribute(new Uint16Array(data.index.array), 1));
        const material = new MeshStandardMaterial({ color: new Color(data.color[0], data.color[1], data.color[2]) });
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        this.setRenderMode(mesh);
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
  private loadModelSTL = (url: string) => {
    this.stlLoader.loadAsync(url)
      .then(geometry => {
        const material = new MeshStandardMaterial({ color: 0x222 });
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.rescale(mesh);
        mesh.position.y += 0.5;
        mesh.name = Model.STL.toString();
        this.setRenderMode(mesh);
        this.intersectableObjs.add(mesh)
      })
      .catch(error => console.log(error))
      .finally(() => this.isLocked = false)
  }
  private loadModelGLB = (url: string) => {
    this.gltfLoader.loadAsync(url)
      .then(obj => {
        obj.scene.traverse(o => {
          o.castShadow = true;
          o.receiveShadow = true;
          this.setRenderMode(o);
        })
        this.rescale(obj.scene);
        obj.scene.rotateY(Math.PI);
        obj.scene.name = Model.GLB.toString();
        this.intersectableObjs.add(obj.scene);
      })
      .catch(error => console.log(error))
      .finally(() => this.isLocked = false);
  }
  private loadModelGLBwithAnimation = (url: string) => {
    this.gltfLoader.loadAsync(url)
      .then(obj => {
        obj.scene.traverse(o => {
          o.castShadow = true;
          o.receiveShadow = true;
          this.setRenderMode(o);
        })
        this.rescale(obj.scene);
        obj.scene.name = Model.ANIMATION.toString();
        this.inputSystem?.dispose();
        this.inputSystem = new InputSystem(obj, this.control);
        this.intersectableObjs.add(obj.scene);
      })
      .catch(error => console.log(error))
      .finally(() => this.isLocked = false);

  }
  private initObjs = () => {
    const planeGeo = new PlaneBufferGeometry(1000, 1000);
    const planeMat = new MeshPhongMaterial({ color: 0xdddddd });
    const plane = new Mesh(planeGeo, planeMat);
    plane.rotateX(-Math.PI / 2);
    plane.receiveShadow = true;
    this.scene.add(plane);
  }
  private initSelectionPoint = () => {
    const geo = new SphereBufferGeometry();
    const mesh = new Mesh(geo, this.selectedMaterial);
    mesh.scale.setScalar(0.02);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }
  // private initSelectionLine = () =>{
  //   const geo = new SphereBufferGeometry();
  //   const mesh = new Mesh(geo,this.selectedMaterial);
  //   mesh.scale.setScalar(0.05);
  //   this.scene.add(mesh);
  //   return mesh;
  // }
  private initSelectionFace = () => {
    const geo = new BufferGeometry();
    const mesh = new Mesh(geo, this.selectedMaterial);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }
  private initSpotLight = (x: number, y: number, z: number, intensity: number) => {
    const light = new SpotLight('white', intensity);
    light.penumbra = 1;
    light.position.set(x, y, z);
    light.lookAt(0, 0, 0);
    light.shadow.mapSize = new Vector2(1024, 1024);
    light.castShadow = true;
    return light;
  }
  // https://vimeo.com/blog/post/your-quick-and-dirty-guide-to-3-point-lighting
  private initLights = () => {
    const lights = new Group();
    const dis = 4;
    const keyLight = this.initSpotLight(-dis, dis, dis, 1);
    const fillLight = this.initSpotLight(dis, dis, dis, 0.5);
    const backLight = this.initSpotLight(-dis, dis, -dis, 0.2);
    const ambientLight = new AmbientLight('white', 0.1);
    lights.add(ambientLight, keyLight, fillLight, backLight);
    this.scene.add(lights);
  }
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
  public loadModel = (mode: Model) => {
    if (this.isLocked) {
      console.log('model is loading')
      return;
    }
    const res = this.clearScene(mode);
    if (!res) {
      switch (mode) {
        case Model.ANIMATION: { this.loadModelGLBwithAnimation('models/RobotExpressive/RobotExpressive.glb'); break; }
        case Model.GLB: { this.loadModelGLB('models/chair.glb'); break; }
        case Model.STL: { this.loadModelSTL('models/7-PMI.stl'); break; }
        case Model.STP: { this.loadModelSTP('models/1_7M.stp'); break; }
        default: {
          console.log('something wrong happened');
        }
      }
    }
  }
  public changeSelectionMode = (mode: Selection) => {
    this.selectionMode = mode;
  }
  public changeRenderMode = (mode: Render) => {
    this.initSelection();
    this.renderMode = mode;
    const targets = Object.values(Model).filter(s => typeof s === 'number');
    this.intersectableObjs.children.forEach(obj => {
      if (targets.includes(parseInt(obj.name))) {
        obj.traverseVisible(o => this.setRenderMode(o));
      }
    })
  }
  public draw = () => {
    this.control.update();
    this.inputSystem?.update(this.clock.getDelta());
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
  private selectMesh = (obj: Object3D) => {
    this.target = obj;
    this.tempMaterial = (this.target as Mesh).material as Material;
    (this.target as Mesh).material = this.selectedMaterial;
  }
  private selectPoint = (point: Vector3) => {
    this.selectedPoint.visible = true;
    this.selectedPoint.position.copy(point);
  }
  private selectLine = () => {

  }
  private selectFace = (obj: Object3D, face?: Face | null) => {
    if (!face) {
      console.log('no face data');
      return;
    }
    if (obj instanceof Mesh) {
      const array = obj.geometry.attributes.position.array as Float32Array;
      const { a, b, c } = face;
      const step = 3;
      const positions = [
        array.at(a * step), array.at(a * step + 1), array.at(a * step + 2),
        array.at(b * step), array.at(b * step + 1), array.at(b * step + 2),
        array.at(c * step), array.at(c * step + 1), array.at(c * step + 2)
      ] as number[]

      // todo: reuse current face mesh
      this.scene.remove(this.selectedFace);
      this.selectedFace = new Mesh(new BufferGeometry(), this.selectedMaterial);
      this.selectedFace.geometry.setAttribute('position', new BufferAttribute(new Float32Array([...positions]), 3));
      this.selectedFace.applyMatrix4(obj.matrixWorld);
      this.scene.add(this.selectedFace)
    }
  }
  private initSelection = () => {
    this.restoreMaterial();
    this.selectedPoint.visible = false;
    this.scene.remove(this.selectedFace); // todo: reuse current face mesh
  }
  private select = (intersection: Intersection) => {
    this.initSelection();
    switch (this.selectionMode) {
      case Selection.MESH: { this.selectMesh(intersection.object); break; }
      case Selection.POINT: { this.selectPoint(intersection.point); break; }
      case Selection.LINE: { this.selectLine(); break; }
      case Selection.FACE: { this.selectFace(intersection.object, intersection.face); break; }
      default: {
        console.log('something wrong');
      }
    }
  }
  public click = () => {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = this.raycaster.intersectObjects(this.intersectableObjs.children, true);
    if (!intersection.length) {
      this.initSelection();
      this.target = null;
      return;
    }
    console.log(intersection)
    const [target] = intersection;
    this.select(target);
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
    this.inputSystem?.dispose();
  }
}