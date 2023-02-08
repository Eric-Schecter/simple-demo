import * as occtimportjs from 'occt-import-js';
import vertexShader from './shaders/line.vs';
import fragmentShader from './shaders/line.fs';
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, Object3D, ShaderMaterial, Vector3 } from 'three';
import { Model, Render } from '../../types';
import { Instance } from './instance';

export class Workpiece extends Instance {
  constructor(url: string, intersectableObjs: Group, cb: (obj: Object3D) => void,renderMode:Render) {
    super();
    occtimportjs()
      .then(async (occt: any) => {
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
          cb(mesh);
          return mesh;
        })
        const standardGroup = new Group();
        standardGroup.name = 'standard';
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
            depthWrite: false,
            transparent: true,
          })
          const mesh = new Mesh(geometry, material);
          mesh.castShadow = true;

          return mesh;
        })
        const customshaderGroup = new Group();
        customshaderGroup.name = 'custom';
        customshaderGroup.add(...customshaderMeshes);

        if(renderMode === Render.WIREShader){
          customshaderGroup.visible = true;
          standardGroup.visible = false;
        }else{
          customshaderGroup.visible = false;
          standardGroup.visible = true;
        }

        const group = new Group();
        group.add(standardGroup, customshaderGroup);
        const vec = this.rescale(group);
        group.translateY(vec.y);
        group.translateX(-vec.z);
        group.scale.multiplyScalar(2);
        group.name = Model.WORKPIECE.toString();
        intersectableObjs.add(group);
      })
  }
}