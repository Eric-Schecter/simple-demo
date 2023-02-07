in vec3 barycentric;

out vec3 v_barycentric;

void main(){
  v_barycentric=barycentric;
  gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.f);
}
