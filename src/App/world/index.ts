import {
  Mesh, Scene, WebGLRenderer, PlaneBufferGeometry,
  MeshPhongMaterial, Group, Object3D, MeshStandardMaterial, BufferGeometry, BufferAttribute,
  Box3, Vector3, sRGBEncoding, Clock, ShaderMaterial, Color,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as occtimportjs from 'occt-import-js';
import Stats from 'stats.js';
import { Model, Render, Selection } from '../types';
import { InputSystem } from './inputSystem';
import vertexShader from './shaders/line.vs';
import fragmentShader from './shaders/line.fs';
import { SelectionSystem } from './selectionSystem';
import { LightSystem } from './lightSystem';
import { CameraSystem } from './cameraSystem';

export class World {
  private scene: Scene;
  private intersectableObjs: Group;
  private timer = 0;
  private renderer: WebGLRenderer;
  private gltfLoader = new GLTFLoader();
  private stlLoader = new STLLoader();
  private isLocked = false;
  private renderMode: Render = Render.STD;
  private inputSystem?: InputSystem;
  private clock = new Clock();
  private stats = new Stats();
  private selectionSystem: SelectionSystem;
  private lightSystem: LightSystem;
  private cameraSystem:CameraSystem;
  constructor(container: HTMLDivElement) {
    const { offsetWidth: width, offsetHeight: height } = container;
    this.renderer = new WebGLRenderer({
      antialias: true,
      // logarithmicDepthBuffer: true // not work with shaderMaterial
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
    this.initObjs();

    this.cameraSystem = new CameraSystem(this.renderer,width,height);
    this.selectionSystem = new SelectionSystem(this.scene,this.cameraSystem.camera,this.intersectableObjs,this.renderer);
    this.lightSystem = new LightSystem(this.scene);

    this.addStats(container);
  }
  private addStats = (container: HTMLDivElement) => {
    this.stats = new Stats();
    this.stats.showPanel(0);
    container.appendChild(this.stats.dom);
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
    } else if (o instanceof Mesh && o.material instanceof ShaderMaterial && this.renderMode === Render.WIREShader) {

    }
  }
  private loadModelSTP = (url: string) => {
    occtimportjs().then(async (occt: any) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const fileBuffer = new Uint8Array(buffer);
      const result = occt.ReadStepFile(fileBuffer, null);
      const standardMeshes = result.meshes.map((data: any) => {
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
      const standardGroup = new Group();
      standardGroup.add(...standardMeshes);

      const customshaderMeshes = result.meshes.map((data: any) => {
        const geometry = new BufferGeometry();
        const nonIndexed: {
          position: number[],
          normal: number[],
          barycentric: number[],
        } = {
          position: [],
          normal: [],
          barycentric: [],
        }
        const positionArray = data.attributes.position.array;
        const normalArray = data.attributes.normal.array;
        for (let i = 0; i < data.index.array.length; i++) {
          const index = data.index.array[i];
          nonIndexed.position.push(positionArray[index * 3], positionArray[index * 3 + 1], positionArray[index * 3 + 2]);
          nonIndexed.normal.push(normalArray[index * 3], normalArray[index * 3 + 1], normalArray[index * 3 + 2]);
        }
        let i = 0;
        let k = 0;
        while (i < nonIndexed.position.length) {
          nonIndexed.barycentric.push(k % 3 === 0 ? 1 : 0, k % 3 === 1 ? 1 : 0, k % 3 === 2 ? 1 : 0);
          i += 3;
          k++;
        }
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(nonIndexed.position), 3));
        geometry.setAttribute('normal', new BufferAttribute(new Float32Array(nonIndexed.normal), 3));
        geometry.setAttribute('barycentric', new BufferAttribute(new Float32Array(nonIndexed.barycentric), 3));
        const material = new ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            u_lineColor: { value: new Vector3(data.color[0], data.color[1], data.color[2]) },
            u_lineWidth: { value: 1 },
          },
          depthTest: true,
          transparent: true,
        })
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        return mesh;
      })
      const customshaderGroup = new Group();
      customshaderGroup.add(...customshaderMeshes);

      const group = new Group();
      group.add(standardGroup);
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
        this.inputSystem = new InputSystem(obj, this.cameraSystem.control);
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
    this.selectionSystem.selectionMode = mode;
  }
  public changeRenderMode = (mode: Render) => {
    this.selectionSystem.initSelection();
    this.renderMode = mode;
    const targets = Object.values(Model).filter(s => typeof s === 'number');
    this.intersectableObjs.children.forEach(obj => {
      if (targets.includes(parseInt(obj.name))) {
        obj.traverseVisible(o => this.setRenderMode(o));
      }
    })
  }
  public draw = () => {
    this.stats.begin();
    this.cameraSystem.control.update();
    this.inputSystem?.update(this.clock.getDelta());
    this.renderer.render(this.scene, this.cameraSystem.camera);
    this.timer = requestAnimationFrame(this.draw);
    this.stats.end();
  }
  public mousemove = (e: React.MouseEvent<HTMLDivElement>) => {
    this.selectionSystem.mousemove(e);
  }
  public click = () => {
    this.selectionSystem.click();
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
    this.inputSystem?.dispose();
  }
}