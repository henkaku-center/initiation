import type { BubbleScene } from "./bubbles";

const vertex = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const fragment = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uBounds;
uniform sampler2D uBackdrop;
uniform vec3 uBubbles[6];
uniform vec4 uCursor;
uniform vec2 uDirection;
out vec4 color;

vec4 joinFields(vec4 a, vec4 b) {
  float k = 0.038;
  float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
  return vec4(mix(b.x, a.x, h) - k*h*(1.0-h), mix(b.yz, a.yz, h), mix(b.w,a.w,h));
}
vec4 circle(vec2 p, vec3 ball) {
  vec2 q = p - ball.xy;
  float d = max(length(q), 0.00001);
  return vec4(d-ball.z, q/d, ball.z);
}
void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  vec2 p = vec2(uv.x, 1.0-uv.y)*uBounds;
  vec4 field = vec4(100.0, 0.0, 0.0, 0.1);
  for(int i=0;i<6;i++) field = joinFields(field,circle(p,uBubbles[i]));
  if(uCursor.z>0.0005) {
    vec2 perpendicular=vec2(-uDirection.y,uDirection.x);
    vec2 delta=p-uCursor.xy;
    vec2 q=vec2(dot(delta,uDirection)/uCursor.w,dot(delta,perpendicular)*uCursor.w);
    float len=max(length(q),0.00001);
    vec2 gradient=(q.x/uCursor.w*uDirection+q.y*uCursor.w*perpendicular)/len;
    field=joinFields(field,vec4((len-uCursor.z)/uCursor.w,gradient/uCursor.w,uCursor.z/uCursor.w));
  }
  vec3 background=texture(uBackdrop,uv).rgb;
  if(field.x>0.035){ color=vec4(background,1.0); return; }
  float pixel=max(uBounds.x/uResolution.x,uBounds.y/uResolution.y);
  float mask=1.0-smoothstep(-pixel,pixel,field.x);
  vec2 n=field.yz/max(length(field.yz),0.00001);
  float depth=clamp(-field.x/max(field.w,0.005),0.0,1.0);
  vec2 bend=vec2(n.x,-n.y)/uBounds * (0.026+depth*0.016) * pow(max(depth,0.0),0.3)*(1.0-depth);
  vec3 refracted=vec3(texture(uBackdrop,uv-bend*1.035).r,texture(uBackdrop,uv-bend).g,texture(uBackdrop,uv-bend*0.965).b);
  vec2 surface=vec2(n.x,-n.y)*(1.0-depth);
  vec3 normal=normalize(vec3(surface,sqrt(max(0.001,1.0-dot(surface,surface)))));
  float shine=pow(max(0.0,dot(normal,normalize(vec3(-0.45,0.65,0.72)))),38.0);
  float rim=pow(1.0-depth,4.0);
  vec3 glass=refracted*(0.90+depth*0.13)+vec3(0.19,0.24,0.40)*rim*0.25+shine*0.7;
  glass=mix(glass,vec3(0.23,0.31,0.57),rim*0.20);
  float shadow=(1.0-smoothstep(0.0,0.03,max(field.x,0.0)))*0.09;
  color=vec4(mix(background*(1.0-shadow),clamp(glass,0.0,1.0),mask),1.0);
}`;

function backdrop(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas2D unavailable");
  ctx.fillStyle = "#f6f6f2";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width * 0.52, height * 0.5);
  ctx.strokeStyle = "#adb3c445";
  ctx.lineWidth = 1;
  for (const angle of [-0.5, 0.55]) {
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.21, height * 0.47, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = "#11131a";
  ctx.beginPath();
  ctx.moveTo(width * 0.25, height * 0.05);
  ctx.lineTo(width * 0.9, height * 0.63);
  ctx.lineTo(width * 0.2, height * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(width * 0.61, height * 0.5);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#263df5";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${height * 0.18}px Arial, sans-serif`;
  ctx.fillText("HENKAKU", 0, 0);
  ctx.restore();
  return canvas;
}

export function createGlassRenderer(gl: WebGL2RenderingContext) {
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const texture = gl.createTexture();
  if (!program || !texture) throw new Error("WebGL resources unavailable");
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteTexture(texture);
  };
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error("Glass shader unavailable");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Glass program unavailable");
    gl.useProgram(program);
    const resolution = gl.getUniformLocation(program, "uResolution");
    const bounds = gl.getUniformLocation(program, "uBounds");
    const bubbles = gl.getUniformLocation(program, "uBubbles[0]");
    const cursor = gl.getUniformLocation(program, "uCursor");
    const direction = gl.getUniformLocation(program, "uDirection");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "uBackdrop"), 0);
    const positions = new Float32Array(18);
    return {
      resize(width: number, height: number) {
        gl.viewport(0, 0, width, height);
        gl.uniform2f(resolution, width, height);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          backdrop(width, height),
        );
      },
      draw(scene: BubbleScene) {
        scene.bubbles.forEach((b, i) => {
          positions[i * 3] = b.x;
          positions[i * 3 + 1] = b.y;
          positions[i * 3 + 2] = b.radius;
        });
        gl.uniform2f(bounds, scene.bounds.width, scene.bounds.height);
        gl.uniform3fv(bubbles, positions);
        const c = scene.cursor;
        gl.uniform4f(cursor, c.x, c.y, c.radius, c.stretch);
        const speed = Math.hypot(c.vx, c.vy);
        gl.uniform2f(
          direction,
          speed > 0.01 ? c.vx / speed : 1,
          speed > 0.01 ? c.vy / speed : 0,
        );
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
