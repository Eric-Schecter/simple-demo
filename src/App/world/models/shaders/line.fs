precision mediump float;

uniform vec3 u_lineColor;
uniform float u_lineWidth;

in vec3 v_barycentric;

void main(){
  vec3 bgColor=vec3(0.);
  vec3 barycentric=v_barycentric;

  // d refers to change rate
  vec3 d=fwidth(barycentric);
  // map d to barycentric
  vec3 a3=smoothstep(vec3(0.),d*u_lineWidth,barycentric);
  // close to line color when change rate is small, and vice versa
  float alpha = mix(1.,0.,min(min(a3.x,a3.y),a3.z));

  gl_FragColor=vec4(u_lineColor,alpha);
}
