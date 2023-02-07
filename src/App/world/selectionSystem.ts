import { BufferAttribute, BufferGeometry, Camera, Face, Group, Intersection, Material, Mesh, MeshPhongMaterial,
   Object3D, Raycaster, Scene, SphereBufferGeometry, Vector2, Vector3, WebGLRenderer } from "three";
import { Selection } from "../types";

export class SelectionSystem {
  private selectedPoint: Mesh;
  // private selectedLine:Mesh;
  private selectedFace: Mesh;
  private selectedMaterial = new MeshPhongMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
  private tempMaterial: Material | null = null;
  public target: Object3D | null = null;
  public selectionMode: Selection = Selection.MESH;
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  constructor(private scene:Scene,private camera:Camera,private intersectableObjs: Group,private renderer:WebGLRenderer){
    this.selectedPoint = this.initSelectionPoint();
    // this.selectedLine = this.initSelectionLine();
    this.selectedFace = this.initSelectionFace();
  }
  private restoreMaterial = () => {
    if (this.target && this.tempMaterial) {
      (this.target as Mesh).material = this.tempMaterial;
    }
  }
  public initSelection = () => {
    this.restoreMaterial();
    this.selectedPoint.visible = false;
    this.scene.remove(this.selectedFace); // todo: reuse current face mesh
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
  public select = (intersection: Intersection) => {
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
    const [target] = intersection;
    this.select(target);
  }
  public mousemove = (e: React.MouseEvent<HTMLDivElement>) =>{
    const { clientX, clientY } = e;
    const { clientWidth, clientHeight } = this.renderer.domElement;
    this.mouse.set(
      (clientX / clientWidth) * 2 - 1,
      -(clientY / clientHeight) * 2 + 1,
    )
  }
}