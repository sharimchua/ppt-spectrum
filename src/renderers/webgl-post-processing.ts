import { CosmeticsConfig } from '../core/types';

export interface PostProcessingLight {
  x: number;
  y: number;
  velocity: number;
  colorHex: string;
}

export interface PostProcessingShockwave {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  colorHex: string;
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const PARTICLE_VERTEX_SHADER_SOURCE = `
attribute vec4 a_particlePosRadius; // x, y, radius, alpha
attribute vec4 a_particleColor;     // r, g, b, coreRatio
uniform vec2 u_resolution;
uniform float u_dpr;
varying vec4 v_color;
varying float v_coreRatio;

void main() {
  vec2 pos = a_particlePosRadius.xy * u_dpr;
  vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
  clipSpace.y = -clipSpace.y;
  gl_Position = vec4(clipSpace, 0.0, 1.0);
  gl_PointSize = max(1.0, a_particlePosRadius.z * 2.0 * u_dpr);
  v_color = vec4(a_particleColor.rgb, a_particlePosRadius.w);
  v_coreRatio = a_particleColor.a > 0.0 ? a_particleColor.a : 0.4;
}
`;

const PARTICLE_FRAGMENT_SHADER_SOURCE = `
precision mediump float;
varying vec4 v_color;
varying float v_coreRatio;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;
  if (dist > 1.0) {
    discard;
  }
  float halo = clamp(1.0 - dist, 0.0, 1.0);
  float core = clamp(1.0 - dist / v_coreRatio, 0.0, 1.0);
  float a = halo * v_color.a;
  vec3 rgb = mix(v_color.rgb, vec3(1.0), core * 0.75);
  gl_FragColor = vec4(rgb * a, a);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;
varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainContrast;
uniform float u_scanlineIntensity;
uniform float u_scanlineDensity;
uniform float u_crtVignette;
uniform float u_crtCurvature;
uniform float u_lightBleed;
uniform float u_lensFlare;
uniform int u_flareStyle;
uniform int u_lightCount;
uniform vec4 u_lights[16];
uniform vec3 u_lightColors[16];
uniform vec2 u_opticalCenter;

uniform int u_shockwaveCount;
uniform vec4 u_shockwaves[4];
uniform vec3 u_shockwaveColors[4];

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += vec3(dot(p3, p3.yzx + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

vec2 crtDistort(vec2 uv, float bend) {
  if (bend <= 0.001) return uv;
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc);
  return uv + cc * (dist * bend);
}

void main() {
  vec2 uv = v_uv;
  vec2 screenPixelCoord = v_uv * u_resolution;

  if (u_crtCurvature > 0.001) {
    uv = crtDistort(uv, u_crtCurvature * 0.15);
  }

  vec2 pixelCoord = uv * u_resolution;
  vec3 additiveColor = vec3(0.0);
  float additiveAlpha = 0.0;
  float darkAttenuation = 0.0;

  // Lights, halation, and lens flares
  if ((u_lightBleed > 0.01 || u_lensFlare > 0.01) && u_lightCount > 0) {
    for (int i = 0; i < 16; i++) {
      if (i >= u_lightCount) break;
      vec2 lightPos = u_lights[i].xy;
      float vel = u_lights[i].z;
      vec3 lightColor = u_lightColors[i];

      vec2 d = screenPixelCoord - lightPos;
      float dist = length(d);

      if (u_lightBleed > 0.01 && vel > 0.0001) {
        float halationR = max(16.0, 42.0 * u_lightBleed + vel * 32.0);
        float hFalloff = exp(-dist / halationR);
        vec3 halationColor = mix(lightColor, vec3(0.98, 0.57, 0.24), 0.35);
        float hAlpha = hFalloff * vel * u_lightBleed * 0.70;
        additiveColor += halationColor * hAlpha;
        additiveAlpha = max(additiveAlpha, hAlpha);

        float streakHalfW = min(u_resolution.x * 0.45, 120.0 + 260.0 * u_lightBleed);
        float streakH = max(2.5, 5.0 * vel);
        if (abs(d.y) < streakH * 2.0 && abs(d.x) < streakHalfW) {
          float sX = clamp(1.0 - abs(d.x) / streakHalfW, 0.0, 1.0);
          float sY = clamp(1.0 - abs(d.y) / (streakH * 2.0), 0.0, 1.0);
          float sAlpha = sX * sY * vel * u_lightBleed * 0.45;
          additiveColor += lightColor * sAlpha;
          additiveAlpha = max(additiveAlpha, sAlpha);
        }
      }

      if (u_lensFlare > 0.01 && vel > 0.0001) {
        float flareAlpha = vel * u_lensFlare;
        float coreR = max(8.0, 16.0 * u_lensFlare * (0.65 + vel * 0.55));
        float coreFalloff = exp(-dist / (coreR * 0.7));
        float cAlpha = coreFalloff * flareAlpha * 0.95;
        additiveColor += vec3(1.0) * cAlpha + lightColor * (cAlpha * 0.6);
        additiveAlpha = max(additiveAlpha, cAlpha);

        if (u_flareStyle == 1 || u_flareStyle == 2) {
          float rayLen = min(u_resolution.x * 0.35, 50.0 + 160.0 * u_lensFlare * (0.55 + vel * 0.45));
          if (dist < rayLen && dist > 1.0) {
            float angle = atan(d.y, d.x);
            float rayPattern = pow(max(0.0, abs(cos(angle * 3.0 + 0.2618))), 18.0);
            float rFalloff = clamp(1.0 - dist / rayLen, 0.0, 1.0);
            float rAlpha = rayPattern * rFalloff * flareAlpha * 0.85;
            vec3 rayCol = mix(lightColor, vec3(1.0), 0.55);
            additiveColor += rayCol * rAlpha;
            additiveAlpha = max(additiveAlpha, rAlpha);
          }
        }

        if (u_flareStyle == 0 || u_flareStyle == 2) {
          float aStreakW = min(u_resolution.x * 0.72, 220.0 + 460.0 * u_lensFlare);
          float aStreakH = max(2.5, 4.5 * vel);
          if (abs(d.y) < aStreakH * 2.5 && abs(d.x) < aStreakW) {
            float aX = clamp(1.0 - abs(d.x) / aStreakW, 0.0, 1.0);
            float aY = clamp(1.0 - abs(d.y) / (aStreakH * 2.5), 0.0, 1.0);
            float aAlpha = pow(aX, 2.0) * aY * flareAlpha * 0.75;
            vec3 streakCol = mix(lightColor, vec3(0.22, 0.74, 0.97), 0.4);
            additiveColor += streakCol * aAlpha;
            additiveAlpha = max(additiveAlpha, aAlpha);
          }
        }
      }
    }
  }

  // Analytical expanding shockwaves
  if (u_shockwaveCount > 0) {
    for (int i = 0; i < 4; i++) {
      if (i >= u_shockwaveCount) break;
      vec2 swPos = u_shockwaves[i].xy;
      float swRadius = u_shockwaves[i].z;
      float swAlpha = u_shockwaves[i].w;
      vec3 swCol = u_shockwaveColors[i];

      if (swAlpha > 0.01 && swRadius > 1.0) {
        float d = length(screenPixelCoord - swPos);
        float ringDist = abs(d - swRadius);
        float ringWidth = max(2.5, swRadius * 0.045);
        if (ringDist < ringWidth * 2.5) {
          float ringFalloff = clamp(1.0 - ringDist / (ringWidth * 2.5), 0.0, 1.0);
          float rA = pow(ringFalloff, 1.8) * swAlpha;
          vec3 col = mix(swCol, vec3(1.0), clamp(1.0 - ringDist / ringWidth, 0.0, 1.0) * 0.65);
          additiveColor += col * rA;
          additiveAlpha = max(additiveAlpha, rA);
        }
      }
    }
  }

  // Film grain
  if (u_grainIntensity > 0.01) {
    float timeStep = floor(u_time * 24.0) / 24.0;
    float grainScale = max(1.0, u_grainSize);
    vec2 grainCoord = floor(pixelCoord / grainScale);
    float noise = hash(grainCoord + vec2(timeStep * 137.15, timeStep * 269.83));
    float contrast = clamp(u_grainContrast, 0.0, 1.0);
    noise = (noise - 0.5) * (1.0 + contrast * 1.5) + 0.5;
    noise = clamp(noise, 0.0, 1.0);

    float gAlpha = u_grainIntensity * (0.12 + contrast * 0.18);
    vec3 grainCol = vec3(noise);
    additiveColor += grainCol * gAlpha;
    additiveAlpha = max(additiveAlpha, gAlpha * 0.7);
  }

  // CRT scanlines
  if (u_scanlineIntensity > 0.01) {
    float stepSize = 3.0;
    if (u_scanlineDensity <= 1.5) stepSize = 2.0;
    else if (u_scanlineDensity <= 2.5) stepSize = 3.0;
    else if (u_scanlineDensity <= 3.5) stepSize = 4.0;
    else stepSize = 6.0;

    float scanlineVal = sin(pixelCoord.y * (6.2831853 / stepSize));
    float scanlineDarkness = (0.5 - 0.5 * scanlineVal) * u_scanlineIntensity * 0.55;
    darkAttenuation += scanlineDarkness;
  }

  // CRT vignette
  if (u_crtVignette > 0.01) {
    vec2 vCenter = abs(uv - 0.5) * 2.0;
    float vDist = dot(vCenter, vCenter);
    float vAlpha = smoothstep(0.4, 1.4, vDist) * u_crtVignette * 0.85;
    darkAttenuation += vAlpha;
  }

  darkAttenuation = clamp(darkAttenuation, 0.0, 1.0);
  vec3 finalColor = additiveColor * (1.0 - darkAttenuation * 0.7);
  float finalAlpha = clamp(darkAttenuation * 0.85 + additiveAlpha, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = (parseInt(clean.substring(0, 2), 16) || 255) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 255) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 255) / 255;
  return [r, g, b];
}

export class WebGLPostProcessingPipeline {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private isSupported: boolean = false;

  private particleProgram: WebGLProgram | null = null;
  private particleBuffer: WebGLBuffer | null = null;
  private uParticleResolutionLoc: WebGLUniformLocation | null = null;
  private uParticleDprLoc: WebGLUniformLocation | null = null;
  private aParticlePosRadiusLoc: number = -1;
  private aParticleColorLoc: number = -1;

  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uGrainIntensityLoc: WebGLUniformLocation | null = null;
  private uGrainSizeLoc: WebGLUniformLocation | null = null;
  private uGrainContrastLoc: WebGLUniformLocation | null = null;
  private uScanlineIntensityLoc: WebGLUniformLocation | null = null;
  private uScanlineDensityLoc: WebGLUniformLocation | null = null;
  private uCrtVignetteLoc: WebGLUniformLocation | null = null;
  private uCrtCurvatureLoc: WebGLUniformLocation | null = null;
  private uLightBleedLoc: WebGLUniformLocation | null = null;
  private uLensFlareLoc: WebGLUniformLocation | null = null;
  private uFlareStyleLoc: WebGLUniformLocation | null = null;
  private uLightCountLoc: WebGLUniformLocation | null = null;
  private uLightsLoc: WebGLUniformLocation | null = null;
  private uLightColorsLoc: WebGLUniformLocation | null = null;
  private uOpticalCenterLoc: WebGLUniformLocation | null = null;

  private uShockwaveCountLoc: WebGLUniformLocation | null = null;
  private uShockwavesLoc: WebGLUniformLocation | null = null;
  private uShockwaveColorsLoc: WebGLUniformLocation | null = null;

  private lightsArray = new Float32Array(16 * 4);
  private lightColorsArray = new Float32Array(16 * 3);
  private shockwavesArray = new Float32Array(4 * 4);
  private shockwaveColorsArray = new Float32Array(4 * 3);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initWebGL();
  }

  private initWebGL() {
    try {
      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
      });
      if (!this.gl) return;

      this.program = this.createProgram(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
      if (!this.program) return;

      this.particleProgram = this.createProgram(PARTICLE_VERTEX_SHADER_SOURCE, PARTICLE_FRAGMENT_SHADER_SOURCE);

      const gl = this.gl;
      this.quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
      gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

      if (this.particleProgram) {
        this.particleBuffer = gl.createBuffer();
        this.uParticleResolutionLoc = gl.getUniformLocation(this.particleProgram, 'u_resolution');
        this.uParticleDprLoc = gl.getUniformLocation(this.particleProgram, 'u_dpr');
        this.aParticlePosRadiusLoc = gl.getAttribLocation(this.particleProgram, 'a_particlePosRadius');
        this.aParticleColorLoc = gl.getAttribLocation(this.particleProgram, 'a_particleColor');
      }

      this.uResolutionLoc = gl.getUniformLocation(this.program, 'u_resolution');
      this.uTimeLoc = gl.getUniformLocation(this.program, 'u_time');
      this.uGrainIntensityLoc = gl.getUniformLocation(this.program, 'u_grainIntensity');
      this.uGrainSizeLoc = gl.getUniformLocation(this.program, 'u_grainSize');
      this.uGrainContrastLoc = gl.getUniformLocation(this.program, 'u_grainContrast');
      this.uScanlineIntensityLoc = gl.getUniformLocation(this.program, 'u_scanlineIntensity');
      this.uScanlineDensityLoc = gl.getUniformLocation(this.program, 'u_scanlineDensity');
      this.uCrtVignetteLoc = gl.getUniformLocation(this.program, 'u_crtVignette');
      this.uCrtCurvatureLoc = gl.getUniformLocation(this.program, 'u_crtCurvature');
      this.uLightBleedLoc = gl.getUniformLocation(this.program, 'u_lightBleed');
      this.uLensFlareLoc = gl.getUniformLocation(this.program, 'u_lensFlare');
      this.uFlareStyleLoc = gl.getUniformLocation(this.program, 'u_flareStyle');
      this.uLightCountLoc = gl.getUniformLocation(this.program, 'u_lightCount');
      this.uLightsLoc = gl.getUniformLocation(this.program, 'u_lights');
      this.uLightColorsLoc = gl.getUniformLocation(this.program, 'u_lightColors');
      this.uOpticalCenterLoc = gl.getUniformLocation(this.program, 'u_opticalCenter');
      this.uShockwaveCountLoc = gl.getUniformLocation(this.program, 'u_shockwaveCount');
      this.uShockwavesLoc = gl.getUniformLocation(this.program, 'u_shockwaves');
      this.uShockwaveColorsLoc = gl.getUniformLocation(this.program, 'u_shockwaveColors');

      this.isSupported = true;
    } catch (e) {
      console.warn('[WebGLPostProcessingPipeline] WebGL initialization failed:', e);
      this.isSupported = false;
    }
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  public render(
    config: CosmeticsConfig,
    lights: PostProcessingLight[] = [],
    shockwaves: PostProcessingShockwave[] = [],
    particleBufferData?: { buffer: Float32Array; count: number }
  ) {
    if (!this.isSupported || !this.gl || !this.program) return;
    if (config.performanceProfile === 'eco' || !config.webglEnabled) {
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      return;
    }

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // 1. Draw GPU Point Sprites
    if (
      this.particleProgram &&
      this.particleBuffer &&
      particleBufferData &&
      particleBufferData.count > 0 &&
      config.sparksEnabled
    ) {
      gl.useProgram(this.particleProgram);
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      gl.uniform2f(this.uParticleResolutionLoc, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uParticleDprLoc, dpr);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        particleBufferData.buffer.subarray(0, particleBufferData.count * 8),
        gl.DYNAMIC_DRAW
      );

      const stride = 8 * 4;
      if (this.aParticlePosRadiusLoc >= 0) {
        gl.enableVertexAttribArray(this.aParticlePosRadiusLoc);
        gl.vertexAttribPointer(this.aParticlePosRadiusLoc, 4, gl.FLOAT, false, stride, 0);
      }
      if (this.aParticleColorLoc >= 0) {
        gl.enableVertexAttribArray(this.aParticleColorLoc);
        gl.vertexAttribPointer(this.aParticleColorLoc, 4, gl.FLOAT, false, stride, 4 * 4);
      }

      gl.drawArrays(gl.POINTS, 0, particleBufferData.count);
    }

    // 2. Draw Fullscreen Shader Optics
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const aPos = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    gl.uniform2f(this.uResolutionLoc, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uTimeLoc, performance.now() / 1000.0);

    gl.uniform1f(this.uGrainIntensityLoc, config.filmGrainEnabled ? config.filmGrainIntensity : 0.0);
    gl.uniform1f(this.uGrainSizeLoc, config.filmGrainSize * dpr);
    gl.uniform1f(this.uGrainContrastLoc, config.filmGrainContrast);
    gl.uniform1f(this.uScanlineIntensityLoc, config.scanlinesEnabled ? config.scanlineIntensity : 0.0);
    gl.uniform1f(this.uScanlineDensityLoc, config.scanlineDensity);
    gl.uniform1f(this.uCrtVignetteLoc, config.crtVignette);
    gl.uniform1f(this.uCrtCurvatureLoc, config.crtCurvature);
    gl.uniform1f(this.uLightBleedLoc, config.lightBleedEnabled ? config.lightBleedIntensity : 0.0);
    gl.uniform1f(this.uLensFlareLoc, config.lensFlareEnabled ? config.lensFlareIntensity : 0.0);
    gl.uniform1i(
      this.uFlareStyleLoc,
      config.lensFlareStyle === 'anamorphic' ? 0 : config.lensFlareStyle === 'starburst' ? 1 : 2
    );
    gl.uniform2f(this.uOpticalCenterLoc, this.canvas.width * 0.5, this.canvas.height * 0.5);

    // Populate lights
    const count = Math.min(lights.length, 16);
    gl.uniform1i(this.uLightCountLoc, count);
    for (let i = 0; i < count; i++) {
      const l = lights[i];
      const rgb = parseHexColor(l.colorHex);
      this.lightsArray[i * 4] = l.x * dpr;
      this.lightsArray[i * 4 + 1] = l.y * dpr;
      this.lightsArray[i * 4 + 2] = l.velocity;
      this.lightsArray[i * 4 + 3] = 1.0;
      this.lightColorsArray[i * 3] = rgb[0];
      this.lightColorsArray[i * 3 + 1] = rgb[1];
      this.lightColorsArray[i * 3 + 2] = rgb[2];
    }
    if (count > 0) {
      gl.uniform4fv(this.uLightsLoc, this.lightsArray);
      gl.uniform3fv(this.uLightColorsLoc, this.lightColorsArray);
    }

    // Populate shockwaves
    const swCount = Math.min(shockwaves.length, 4);
    gl.uniform1i(this.uShockwaveCountLoc, swCount);
    for (let i = 0; i < swCount; i++) {
      const sw = shockwaves[i];
      const rgb = parseHexColor(sw.colorHex);
      this.shockwavesArray[i * 4] = sw.x * dpr;
      this.shockwavesArray[i * 4 + 1] = sw.y * dpr;
      this.shockwavesArray[i * 4 + 2] = sw.radius * dpr;
      this.shockwavesArray[i * 4 + 3] = sw.alpha;
      this.shockwaveColorsArray[i * 3] = rgb[0];
      this.shockwaveColorsArray[i * 3 + 1] = rgb[1];
      this.shockwaveColorsArray[i * 3 + 2] = rgb[2];
    }
    if (swCount > 0) {
      gl.uniform4fv(this.uShockwavesLoc, this.shockwavesArray);
      gl.uniform3fv(this.uShockwaveColorsLoc, this.shockwaveColorsArray);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy() {
    if (!this.gl) return;
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.particleProgram) this.gl.deleteProgram(this.particleProgram);
    if (this.quadBuffer) this.gl.deleteBuffer(this.quadBuffer);
    if (this.particleBuffer) this.gl.deleteBuffer(this.particleBuffer);
    this.gl = null;
    this.isSupported = false;
  }
}
