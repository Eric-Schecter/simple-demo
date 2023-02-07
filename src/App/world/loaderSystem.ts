import { Box3, BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, Object3D, ShaderMaterial, Vector3 } from "three";
import * as occtimportjs from 'occt-import-js';
import vertexShader from './shaders/line.vs';
import fragmentShader from './shaders/line.fs';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { InputSystem } from './inputSystem';
import { Model, Render } from "../types";
import { SelectionSystem } from "./selectionSystem";

export class LoaderSystem {
  private gltfLoader = new GLTFLoader();
  private stlLoader = new STLLoader();
  private renderMode: Render = Render.STD;
  private isLocked = false;
  constructor(private intersectableObjs:Group,private selectionSystem:SelectionSystem,private inputSystem:InputSystem){}
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
  public loadSTP = (url: string) => {
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
        mesh.visible = false;
        return mesh;
      })
      const customshaderGroup = new Group();
      customshaderGroup.add(...customshaderMeshes);

      const group = new Group();
      group.add(standardGroup,customshaderGroup);
      const vec = this.rescale(group);
      group.translateY(vec.y);
      group.translateX(-vec.z);
      group.scale.multiplyScalar(2);
      group.name = Model.STP.toString();
      this.intersectableObjs.add(group);
      this.isLocked = false;
    })
  }
  public loadSTL = (url: string) => {
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
  public loadGLB = (url: string) => {
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
  public loadGLBwithAnimation = (url: string) => {
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
        this.inputSystem.setup(obj);
        this.intersectableObjs.add(obj.scene);
      })
      .catch(error => console.log(error))
      .finally(() => this.isLocked = false);
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
  public loadModel = (mode: Model) =>{
    if (this.isLocked) {
      console.log('model is loading')
      return;
    }
    const res = this.clearScene(mode);
    if (!res) {
      switch (mode) {
        case Model.ANIMATION: { this.loadGLBwithAnimation('models/RobotExpressive/RobotExpressive.glb'); break; }
        case Model.GLB: { this.loadGLB('models/chair.glb'); break; }
        case Model.STL: { this.loadSTL('models/7-PMI.stl'); break; }
        case Model.STP: { this.loadSTP('models/1_7M.stp'); break; }
        default: {
          console.log('something wrong happened');
        }
      }
    }
  }
}