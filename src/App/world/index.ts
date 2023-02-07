import {
  Mesh, Scene, WebGLRenderer, PlaneBufferGeometry,
  MeshPhongMaterial, Group,
  sRGBEncoding, Clock,
} from 'three';
import Stats from 'stats.js';
import { Model, Render, Selection } from '../types';
import { SelectionSystem } from './selectionSystem';
import { LightSystem } from './lightSystem';
import { CameraSystem } from './cameraSystem';
import { LoaderSystem } from './loaderSystem';
import { InputSystem } from './inputSystem';

export class World {
  private scene: Scene;
  private intersectableObjs: Group;
  private timer = 0;
  private renderer: WebGLRenderer;
  private clock = new Clock();
  private stats = new Stats();
  private selectionSystem: SelectionSystem;
  private lightSystem: LightSystem;
  private cameraSystem: CameraSystem;
  private loaderSystem: LoaderSystem;
  private inputSystem?:InputSystem;
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

    this.cameraSystem = new CameraSystem(this.renderer, width, height);
    this.selectionSystem = new SelectionSystem(this.scene, this.cameraSystem.camera, this.intersectableObjs, this.renderer);
    this.lightSystem = new LightSystem(this.scene);
    this.inputSystem = new InputSystem(this.cameraSystem.control);
    this.loaderSystem = new LoaderSystem(this.intersectableObjs,this.selectionSystem,this.inputSystem);

    this.addStats(container);
  }
  private addStats = (container: HTMLDivElement) => {
    this.stats = new Stats();
    this.stats.showPanel(0);
    container.appendChild(this.stats.dom);
  }
  private initObjs = () => {
    const planeGeo = new PlaneBufferGeometry(1000, 1000);
    const planeMat = new MeshPhongMaterial({ color: 0xdddddd });
    const plane = new Mesh(planeGeo, planeMat);
    plane.rotateX(-Math.PI / 2);
    plane.receiveShadow = true;
    this.scene.add(plane);
  }
  public loadModel = (model: Model) => {
    this.loaderSystem.loadModel(model);
  }
  public changeSelectionMode = (mode: Selection) => {
    this.selectionSystem.selectionMode = mode;
  }
  public changeRenderMode = (mode: Render) => {
    this.loaderSystem.changeRenderMode(mode);
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