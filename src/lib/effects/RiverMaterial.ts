import * as THREE from 'three';

/**
 * Custom shader material for animated river water
 * Features:
 * - UV scrolling for flow direction
 * - Procedural ripple patterns
 * - Fresnel effect for edge highlights
 * - Depth-based color variation
 */

const riverVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const riverFragmentShader = `
  uniform float uTime;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform float uFlowSpeed;
  uniform vec2 uFlowDirection;
  uniform float uRippleScale;
  uniform float uRippleStrength;
  uniform float uFresnelPower;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  // Simple noise function for ripples
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Smooth noise
  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal noise for more natural patterns
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * smoothNoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    // Flowing UV coordinates
    vec2 flowUv = vUv + uFlowDirection * uTime * uFlowSpeed;

    // Create ripple pattern
    float ripple1 = fbm(flowUv * uRippleScale);
    float ripple2 = fbm(flowUv * uRippleScale * 1.5 + vec2(uTime * 0.3, 0.0));
    float ripples = (ripple1 + ripple2) * 0.5;

    // Fresnel effect for edge highlights
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), uFresnelPower);

    // Mix shallow and deep colors based on ripples and fresnel
    vec3 waterColor = mix(uDeepColor, uShallowColor, ripples * 0.5 + fresnel * 0.3);

    // Add subtle wave highlights
    float highlight = smoothstep(0.55, 0.65, ripples) * 0.3;
    waterColor += vec3(highlight);

    // Add foam/white caps at ripple peaks
    float foam = smoothstep(0.7, 0.8, ripples) * uRippleStrength;
    waterColor = mix(waterColor, vec3(0.9, 0.95, 1.0), foam * 0.5);

    gl_FragColor = vec4(waterColor, uOpacity);
  }
`;

export interface RiverMaterialConfig {
  shallowColor?: THREE.Color;
  deepColor?: THREE.Color;
  flowSpeed?: number;
  flowDirection?: THREE.Vector2;
  rippleScale?: number;
  rippleStrength?: number;
  fresnelPower?: number;
  opacity?: number;
}

export function createRiverMaterial(config: RiverMaterialConfig = {}): THREE.ShaderMaterial {
  const {
    shallowColor = new THREE.Color(0x6ba3d6),
    deepColor = new THREE.Color(0x1a4a7a),
    flowSpeed = 0.15,
    flowDirection = new THREE.Vector2(0.0, -1.0),
    rippleScale = 8.0,
    rippleStrength = 0.6,
    fresnelPower = 2.0,
    opacity = 0.85,
  } = config;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallowColor: { value: shallowColor },
      uDeepColor: { value: deepColor },
      uFlowSpeed: { value: flowSpeed },
      uFlowDirection: { value: flowDirection.normalize() },
      uRippleScale: { value: rippleScale },
      uRippleStrength: { value: rippleStrength },
      uFresnelPower: { value: fresnelPower },
      uOpacity: { value: opacity },
    },
    vertexShader: riverVertexShader,
    fragmentShader: riverFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

/**
 * Update the river material time uniform
 * Call this in your animation loop
 */
export function updateRiverMaterial(material: THREE.ShaderMaterial, deltaTime: number): void {
  if (material.uniforms.uTime) {
    material.uniforms.uTime.value += deltaTime;
  }
}
