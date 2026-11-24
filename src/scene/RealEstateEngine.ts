import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CAMERA_PRESETS,
  ROOMS,
  type CutawayMode,
  type FinishId,
} from '../data/propertyData';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import { createArchitecturalMaterials, type ArchitecturalMaterials } from './materials';
import { buildRidgeviewEstate, type BuiltEstate } from './houseBuilder';

export interface ProjectedPin {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface ProjectedDimension {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  imperial: string;
  metric: string;
}

export interface EngineCallbacks {
  onProjectUpdate?: (pins: ProjectedPin[], dims: ProjectedDimension[]) => void;
  onWebGLContextLost?: () => void;
  onWebGLContextRestored?: () => void;
  onXRSupportChange?: (supportedMode: 'immersive-ar' | 'immersive-vr' | null) => void;
  onXRSessionChange?: (active: boolean) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

// Pre-allocated scratch math objects (zero GC in render loop)
const _projVec = new THREE.Vector3();
const _skyDay = new THREE.Color(0xcbdbe8);
const _skyGolden = new THREE.Color(0xe6b894);
const _skyNight = new THREE.Color(0x131b2b);
const _skyWork = new THREE.Color();
const _sunNoon = new THREE.Color(0xfff5e4);
const _sunGolden = new THREE.Color(0xff9f52);
const _sunNight = new THREE.Color(0x6b89c4);
const _sunWork = new THREE.Color();

const DIM_ANCHORS: Array<{
  id: string;
  pos: [number, number, number];
  imperial: string;
  metric: string;
}> = [
  { id: 'dim-width', pos: [-0.4, 0.55, 4.75], imperial: '47 ft Width', metric: '14.4 m Width' },
  { id: 'dim-depth', pos: [-9.2, 0.55, -0.7], imperial: '30 ft Depth', metric: '9.2 m Depth' },
  { id: 'dim-pool', pos: [-1.6, 0.55, 10.1], imperial: '32 ft Pool', metric: '9.4 m Pool' },
  { id: 'dim-lot', pos: [-0.4, 0.55, 11.7], imperial: '74 ft Terrace', metric: '22.4 m Terrace' },
];

export class RealEstateEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private textures: ProceduralTextureSet;
  private materials: ArchitecturalMaterials;
  private estate: BuiltEstate;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private fog: THREE.FogExp2;

  private cutawayMode: CutawayMode = 'full';
  private showDimensions = false;
  private timeOfDay = 15.2; // 3:12 PM crisp warm afternoon architectural sun

  // Animation / transition state
  private cameraFlying = false;
  private camGoalPos = new THREE.Vector3(...CAMERA_PRESETS.overview.pos);
  private camGoalTarget = new THREE.Vector3(...CAMERA_PRESETS.overview.target);
  private upperY = 0;
  private roofY = 0;
  private upperTargetY = 0;
  private roofTargetY = 0;

  private lastFrameTime = performance.now();
  private renderBusy = false;
  private renderDirty = false;
  private frameId = 0;
  private disposed = false;

  // WebXR optional tabletop session state
  private supportedXRMode: 'immersive-ar' | 'immersive-vr' | null = null;
  private activeXRSession: XRSession | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.scene = new THREE.Scene();
    this.scene.background = _skyDay.clone();
    this.fog = new THREE.FogExp2(0xcbdbe8, 0.0085);
    this.scene.fog = this.fog;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 240);
    this.camera.position.set(...CAMERA_PRESETS.overview.pos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;

    container.appendChild(this.renderer.domElement);

    // Studio IBL environment map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.65;
    pmremGenerator.dispose();

    // OrbitControls tuned for effortless desktop mouse & mobile touch
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...CAMERA_PRESETS.overview.target);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.rotateSpeed = 0.72;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.75;
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 48;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minPolarAngle = 0.12;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.controls.addEventListener('start', () => {
      // Immediately yield control to user so scripted camera flights never fight manual orbiting
      this.cameraFlying = false;
    });
    this.controls.addEventListener('change', () => {
      this.requestRender();
    });

    // Three-point warm/cool architectural lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xcfe4fa, 0x7a6c5a, 0.75);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e4, 2.2);
    this.sunLight.position.set(18, 22, 14);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 75;
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0x9fc2e8, 0.45);
    this.rimLight.position.set(-16, 12, -18);
    this.scene.add(this.rimLight);

    // Build textures, PBR materials, and architectural 3D house
    const maxAniso = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    this.textures = createProceduralTextures(maxAniso);
    this.materials = createArchitecturalMaterials(this.textures, this.isSoftwareGl);
    this.estate = buildRidgeviewEstate(this.materials);
    this.scene.add(this.estate.root);

    this.applySunlight(this.timeOfDay);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind lifecycle & context events
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.checkXRSupport();
    this.controls.update();
    this.requestRender();
  }

  private async checkXRSupport(): Promise<void> {
    if (!navigator.xr) {
      this.callbacks.onXRSupportChange?.(null);
      return;
    }
    try {
      if (await navigator.xr.isSessionSupported('immersive-ar')) {
        this.supportedXRMode = 'immersive-ar';
      } else if (await navigator.xr.isSessionSupported('immersive-vr')) {
        this.supportedXRMode = 'immersive-vr';
      }
      this.callbacks.onXRSupportChange?.(this.supportedXRMode);
    } catch {
      this.callbacks.onXRSupportChange?.(null);
    }
  }

  public async toggleXRSession(): Promise<void> {
    if (this.activeXRSession) {
      await this.activeXRSession.end();
      return;
    }
    if (!navigator.xr || !this.supportedXRMode) return;
    try {
      const session = await navigator.xr.requestSession(this.supportedXRMode, {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      this.activeXRSession = session;
      // Scale estate to tabletop architectural model (1:18 scale) in front of headset user
      this.estate.root.scale.setScalar(0.055);
      this.estate.root.position.set(0, 0.85, -1.35);
      if (this.supportedXRMode === 'immersive-ar') {
        this.scene.background = null;
        this.scene.fog = null;
      }
      session.addEventListener('end', () => {
        this.activeXRSession = null;
        this.estate.root.scale.setScalar(1);
        this.estate.root.position.set(0, 0, 0);
        this.scene.fog = this.fog;
        this.applySunlight(this.timeOfDay);
        this.renderer.setAnimationLoop(null);
        this.callbacks.onXRSessionChange?.(false);
        this.requestRender();
      });
      await this.renderer.xr.setSession(session);
      this.callbacks.onXRSessionChange?.(true);
      this.renderer.setAnimationLoop(() => {
        this.renderer.render(this.scene, this.camera);
      });
    } catch (err) {
      console.warn('WebXR session could not start:', err);
    }
  }

  public setCutawayMode(mode: CutawayMode): void {
    this.cutawayMode = mode;
    if (mode === 'full') {
      this.upperTargetY = 0;
      this.roofTargetY = 0;
    } else if (mode === 'upper') {
      this.upperTargetY = 0;
      this.roofTargetY = 12;
    } else if (mode === 'ground') {
      this.upperTargetY = 12;
      this.roofTargetY = 20;
    } else if (mode === 'exploded') {
      this.upperTargetY = 3.2;
      this.roofTargetY = 6.2;
    }
    this.requestRender();
  }

  public setFinishPreset(finishId: FinishId): void {
    this.materials.applyFinishPreset(finishId);
    this.requestRender();
  }

  public setShowDimensions(show: boolean): void {
    this.showDimensions = show;
    this.estate.dimensionGuidesGroup.visible = show;
    this.requestRender();
  }

  public setTimeOfDay(hours: number): void {
    this.timeOfDay = THREE.MathUtils.clamp(hours, 6.0, 21.5);
    this.applySunlight(this.timeOfDay);
    this.requestRender();
  }

  public flyTo(pos: [number, number, number], target: [number, number, number]): void {
    this.camGoalPos.set(pos[0], pos[1], pos[2]);
    this.camGoalTarget.set(target[0], target[1], target[2]);
    this.cameraFlying = true;
    this.requestRender();
  }

  public resetView(): void {
    this.flyTo(CAMERA_PRESETS.overview.pos, CAMERA_PRESETS.overview.target);
  }

  private applySunlight(hour: number): void {
    // Map daylight arc 6:00 (sunrise East) -> 12:30 (high South) -> 19:00 (sunset West)
    const sunProgress = THREE.MathUtils.clamp((hour - 6.0) / 13.0, 0, 1);
    const azimuth = THREE.MathUtils.lerp(-Math.PI * 0.65, Math.PI * 0.65, sunProgress);
    const elevation = Math.sin(sunProgress * Math.PI) * 1.15; // peak ~66 deg

    const radius = 34;
    const sunX = Math.sin(azimuth) * Math.cos(elevation) * radius;
    const sunY = Math.max(1.5, Math.sin(elevation) * radius);
    const sunZ = Math.cos(azimuth) * Math.cos(elevation) * radius * 0.72;
    this.sunLight.position.set(sunX, sunY, sunZ);

    // Calculate golden hour & night transition factors
    const goldenFactor =
      hour < 9.0
        ? THREE.MathUtils.smoothstep(9.0 - hour, 0, 2.5)
        : hour > 16.0 && hour <= 19.3
          ? THREE.MathUtils.smoothstep(hour, 16.0, 18.2) * (1 - THREE.MathUtils.smoothstep(hour, 18.5, 19.6))
          : 0;
    const nightFactor = THREE.MathUtils.smoothstep(hour, 18.2, 19.8);

    // Sky & horizon fog color
    _skyWork.copy(_skyDay).lerp(_skyGolden, goldenFactor * 0.85).lerp(_skyNight, nightFactor);
    if (!this.activeXRSession || this.supportedXRMode !== 'immersive-ar') {
      this.scene.background = _skyWork.clone();
      this.fog.color.copy(_skyWork);
    }

    // Sun light color & intensity
    _sunWork.copy(_sunNoon).lerp(_sunGolden, goldenFactor).lerp(_sunNight, nightFactor);
    this.sunLight.color.copy(_sunWork);
    this.sunLight.intensity = THREE.MathUtils.lerp(2.35, 0.32, nightFactor) - goldenFactor * 0.25;

    // Ambient hemisphere & environment balance
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.82, 0.24, nightFactor);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.68, 0.22, nightFactor);
    this.rimLight.intensity = THREE.MathUtils.lerp(0.45, 0.25, nightFactor);

    // Warm interior architectural lights bloom smoothly from golden hour into night
    const interiorFactor = THREE.MathUtils.clamp(goldenFactor * 0.45 + nightFactor * 1.0, 0, 1);
    this.materials.setNightGlow(interiorFactor);
    for (const pt of this.estate.interiorLights) {
      pt.intensity = interiorFactor * 18;
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public requestRender(): void {
    if (this.disposed || this.activeXRSession) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
      this.lastFrameTime = now;

      let needsAnotherFrame = false;

      // 1. Smoothly damp cutaway floor elevation
      const prevUpperY = this.upperY;
      const prevRoofY = this.roofY;
      const dampSpeed = this.isSoftwareGl ? 14 : 7.5;
      this.upperY = THREE.MathUtils.damp(this.upperY, this.upperTargetY, dampSpeed, dt);
      this.roofY = THREE.MathUtils.damp(this.roofY, this.roofTargetY, dampSpeed, dt);

      if (Math.abs(this.upperY - this.upperTargetY) < 0.015) this.upperY = this.upperTargetY;
      if (Math.abs(this.roofY - this.roofTargetY) < 0.015) this.roofY = this.roofTargetY;

      this.estate.upperFloorGroup.position.y = this.upperY;
      this.estate.roofGroup.position.y = this.roofY;
      this.estate.upperFloorGroup.visible =
        this.cutawayMode !== 'ground' || this.upperY < 10.5;
      this.estate.roofGroup.visible =
        (this.cutawayMode !== 'ground' && this.cutawayMode !== 'upper') || this.roofY < 10.5;

      if (Math.abs(this.upperY - prevUpperY) > 0.001 || Math.abs(this.roofY - prevRoofY) > 0.001) {
        needsAnotherFrame = true;
      }

      // 2. Smoothly damp camera flight transitions
      if (this.cameraFlying) {
        const camSpeed = this.isSoftwareGl ? 12 : 6.0;
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.camGoalPos.x, camSpeed, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.camGoalPos.y, camSpeed, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.camGoalPos.z, camSpeed, dt);

        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.camGoalTarget.x, camSpeed, dt);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.camGoalTarget.y, camSpeed, dt);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.camGoalTarget.z, camSpeed, dt);

        const posDist = this.camera.position.distanceTo(this.camGoalPos);
        const tgtDist = this.controls.target.distanceTo(this.camGoalTarget);
        if (posDist < 0.04 && tgtDist < 0.04) {
          this.camera.position.copy(this.camGoalPos);
          this.controls.target.copy(this.camGoalTarget);
          this.cameraFlying = false;
        } else {
          needsAnotherFrame = true;
        }
      }

      // 3. Update OrbitControls (keeps damping fluid on GPU)
      const controlsMoved = this.controls.update();
      if (controlsMoved && !this.isSoftwareGl) {
        needsAnotherFrame = true;
      }

      this.renderer.render(this.scene, this.camera);
      this.projectAnnotations();

      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty || needsAnotherFrame) {
          this.requestRender();
        }
      };

      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  }

  private projectAnnotations(): void {
    if (!this.callbacks.onProjectUpdate) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const pins: ProjectedPin[] = ROOMS.map((room) => {
      // Hide upper/rooftop pins when those levels are hidden in cutaway mode
      if (room.floor === 'Rooftop' && (this.cutawayMode === 'upper' || this.cutawayMode === 'ground')) {
        return { id: room.id, x: 0, y: 0, visible: false };
      }
      if (room.floor === 'Upper Floor' && this.cutawayMode === 'ground') {
        return { id: room.id, x: 0, y: 0, visible: false };
      }

      let yOffset = 0;
      if (room.floor === 'Upper Floor') yOffset = this.upperY;
      if (room.floor === 'Rooftop') yOffset = this.roofY;

      _projVec.set(room.labelPos[0], room.labelPos[1] + yOffset, room.labelPos[2]);
      _projVec.project(this.camera);

      const inFront = _projVec.z >= -1 && _projVec.z <= 1;
      const sx = (_projVec.x * 0.5 + 0.5) * width;
      const sy = (-_projVec.y * 0.5 + 0.5) * height;
      const inBounds = sx > 48 && sx < width - 48 && sy > 76 && sy < height - 110;
      return {
        id: room.id,
        x: sx,
        y: sy,
        visible: inFront && inBounds,
      };
    });

    const dims: ProjectedDimension[] = this.showDimensions
      ? DIM_ANCHORS.map((d) => {
          _projVec.set(d.pos[0], d.pos[1], d.pos[2]);
          _projVec.project(this.camera);
          const inFront = _projVec.z >= -1 && _projVec.z <= 1;
          const sx = (_projVec.x * 0.5 + 0.5) * width;
          const sy = (-_projVec.y * 0.5 + 0.5) * height;
          const inBounds = sx > 40 && sx < width - 40 && sy > 70 && sy < height - 100;
          return {
            id: d.id,
            x: sx,
            y: sy,
            visible: inFront && inBounds,
            imperial: d.imperial,
            metric: d.metric,
          };
        })
      : [];

    this.callbacks.onProjectUpdate(pins, dims);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.requestRender();
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.callbacks.onWebGLContextLost?.();
  };

  private handleContextRestored = (): void => {
    this.callbacks.onWebGLContextRestored?.();
    this.requestRender();
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.controls.dispose();
    this.estate.dispose();
    this.materials.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
