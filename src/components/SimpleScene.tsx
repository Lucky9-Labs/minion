'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useGameStore, useHasHydrated } from '@/store/gameStore';
import { createMinion, knightHelmetConfig, getRegisteredSpecies } from '@/lib/minion';
import type { MinionInstance } from '@/lib/minion';
import { CameraRelativeWallCuller } from '@/lib/tower';
import { ContinuousTerrainBuilder, DEFAULT_CONTINUOUS_CONFIG } from '@/lib/terrain';
import type { ExclusionZone } from '@/lib/terrain';
import { createVillagePaths } from '@/lib/terrain/VillagePaths';
import { LayoutGenerator, RoomMeshBuilder } from '@/lib/building';
import type { BuildingRefs, RoomMeshRefs, InteriorLight } from '@/lib/building/RoomMeshBuilder';
import { DayNightCycle, TorchManager, SkyEnvironment } from '@/lib/lighting';
import { CameraController } from '@/lib/camera';
import { TeleportEffect, MagicCircle, ReactionIndicator, Waterfall } from '@/lib/effects';
import type { ReactionType } from '@/lib/effects';
import { IslandEdgeBuilder } from '@/lib/terrain';
import { WizardBehavior } from '@/lib/wizard';
import { useProjectStore } from '@/store/projectStore';
import {
  createProjectBuilding,
  setProjectBuildingSelected,
  type ProjectBuildingMesh,
} from '@/lib/projectBuildings';
import { FirstPersonHands } from '@/lib/FirstPersonHands';
import { StaffInteractionController } from '@/lib/interaction';
import type { ThrownEntity } from '@/lib/interaction/StaffInteractionController';
import type { InteractionMode, MenuOption, DrawnFoundation } from '@/types/interaction';
import { vec3Pool, resetAllPools } from '@/lib/vectorPool';
import { lodManager, LODVisibility } from '@/lib/lodSystem';
import {
  walkabilityCache,
  throttledUpdates,
  UPDATE_INTERVALS,
  horizontalDistance,
  moveToward,
  updateInteriorLight,
  randomRange,
  performanceMonitor,
} from '@/lib/optimizedUpdates';

// Minion data for tracking position and movement
interface MinionSceneData {
  minionId: string;
  instance: MinionInstance;
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  isMoving: boolean;
  idleTimer: number;
  speed: number;
  isInsideBuilding: boolean;
  torchId: string; // ID for this minion's torch
  reactionIndicator: ReactionIndicator;
  personality: 'friendly' | 'cautious' | 'grumpy';
  selectionCrystal: THREE.Mesh; // Sims-style floating crystal above selected minion
}

// Wildlife (squirrels, rabbits) data
interface WildlifeData {
  mesh: THREE.Group;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  isMoving: boolean;
  idleTimer: number;
  speed: number;
  hopPhase: number;
  type: 'squirrel' | 'rabbit' | 'bird';
}

// Cloud shadow data
interface CloudShadowData {
  mesh: THREE.Mesh;
  speed: THREE.Vector2;
  offset: THREE.Vector2;
}

// Building bounds for collision and inside detection
interface BuildingBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorY: number;
}

// Thrown minion physics state
interface ThrownMinionState {
  minionId: string;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3; // For spinning during flight
  bounceCount: number;
}

// Camera bounds from continuous terrain
const WORLD_HALF_SIZE = DEFAULT_CONTINUOUS_CONFIG.worldSize / 2;

// Fixed camera angle (isometric-ish view)
const CAMERA_POLAR_ANGLE = Math.PI / 4; // 45 degrees from vertical

interface SimpleSceneProps {
  onMinionClick?: (minionId: string) => void;
  onProjectClick?: (projectId: string) => void;
  selectedProjectId?: string | null;
  // Interaction callbacks
  onInteractionModeChange?: (mode: InteractionMode) => void;
  onMenuOptionsChange?: (options: MenuOption[] | null) => void;
  onQuickInfoChange?: (show: boolean) => void;
  onFoundationComplete?: (foundation: DrawnFoundation) => void;
  onSelectionDeltaChange?: (delta: { x: number; y: number }) => void;
  onTargetChange?: (target: import('@/types/interaction').Target | null) => void;
  onInteractionControllerReady?: (executeAction: (actionId: string) => void) => void;
}

export function SimpleScene({
  onMinionClick,
  onProjectClick,
  selectedProjectId,
  onInteractionModeChange,
  onMenuOptionsChange,
  onQuickInfoChange,
  onFoundationComplete,
  onSelectionDeltaChange,
  onTargetChange,
  onInteractionControllerReady,
}: SimpleSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const minionsRef = useRef<Map<string, MinionSceneData>>(new Map());
  const projectBuildingsRef = useRef<Map<string, ProjectBuildingMesh>>(new Map());
  const villagePathsRef = useRef<THREE.Group | null>(null);
  const wizardRef = useRef<MinionInstance | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const terrainBuilderRef = useRef<ContinuousTerrainBuilder | null>(null);
  const wallCullerRef = useRef<CameraRelativeWallCuller | null>(null);
  const buildingBoundsRef = useRef<BuildingBounds | null>(null);
  const dayNightCycleRef = useRef<DayNightCycle | null>(null);
  const torchManagerRef = useRef<TorchManager | null>(null);
  const interiorLightsRef = useRef<InteriorLight[]>([]);
  const collisionMeshesRef = useRef<THREE.Mesh[]>([]);
  const teleportEffectRef = useRef<TeleportEffect | null>(null);
  const magicCircleRef = useRef<MagicCircle | null>(null);
  const wizardBehaviorRef = useRef<WizardBehavior | null>(null);
  const wildlifeRef = useRef<WildlifeData[]>([]);
  const cloudShadowsRef = useRef<CloudShadowData[]>([]);
  const skyEnvironmentRef = useRef<SkyEnvironment | null>(null);
  const islandEdgeRef = useRef<THREE.Group | null>(null);
  const waterfallRef = useRef<Waterfall | null>(null);
  const interactionControllerRef = useRef<StaffInteractionController | null>(null);
  const firstPersonHandsRef = useRef<FirstPersonHands | null>(null);
  const isFirstPersonRef = useRef<boolean>(false);
  const lastDeltaUpdateRef = useRef<number>(0);
  const thrownMinionsRef = useRef<Map<string, ThrownMinionState>>(new Map());

  // Ref for stable click handler - avoids effect re-runs when dependencies change
  const handleClickRef = useRef<((event: MouseEvent) => void) | null>(null);

  const hasHydrated = useHasHydrated();
  const minions = useGameStore((state) => state.minions);
  const selectedMinionId = useGameStore((state) => state.selectedMinionId);
  const setSelectedMinion = useGameStore((state) => state.setSelectedMinion);
  const conversation = useGameStore((state) => state.conversation);
  const enterConversation = useGameStore((state) => state.enterConversation);
  const exitConversation = useGameStore((state) => state.exitConversation);
  const setConversationPhase = useGameStore((state) => state.setConversationPhase);
  const transitionToMinion = useGameStore((state) => state.transitionToMinion);

  // Project store
  const { projects, scanProjects } = useProjectStore();

  // Handle click on canvas
  const handleClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !sceneRef.current) return;

    // Use the camera controller's active camera for raycasting
    const camera = cameraControllerRef.current?.getCamera() || cameraRef.current;
    if (!camera) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    // Check for project building clicks first
    const buildingMeshes: THREE.Object3D[] = [];
    projectBuildingsRef.current.forEach((building) => {
      buildingMeshes.push(building.group);
    });

    const buildingIntersects = raycasterRef.current.intersectObjects(buildingMeshes, true);
    if (buildingIntersects.length > 0) {
      let clickedObject = buildingIntersects[0].object;
      while (clickedObject.parent && !clickedObject.userData.projectId) {
        clickedObject = clickedObject.parent;
      }

      const projectId = clickedObject.userData.projectId;
      if (projectId) {
        onProjectClick?.(projectId);
        return;
      }
    }

    // Check for minion clicks
    const minionMeshes: THREE.Object3D[] = [];
    minionsRef.current.forEach((data) => {
      minionMeshes.push(data.instance.mesh);
    });

    const intersects = raycasterRef.current.intersectObjects(minionMeshes, true);

    if (intersects.length > 0) {
      let clickedObject = intersects[0].object;
      while (clickedObject.parent && !clickedObject.userData.minionId) {
        clickedObject = clickedObject.parent;
      }

      const minionId = clickedObject.userData.minionId;
      if (minionId) {
        // Get the minion's position for camera animation
        const minionData = minionsRef.current.get(minionId);
        const wizard = wizardRef.current;

        if (minionData && wizard && cameraControllerRef.current) {
          const minionPos = minionData.currentPosition.clone();

          // Check if already in conversation
          const store = useGameStore.getState();
          if (store.conversation.active) {
            // Transition to different minion
            if (store.conversation.minionId !== minionId) {
              transitionToMinion(minionId);

              // Get the new minion data for reaction
              const newMinionData = minionsRef.current.get(minionId);

              // Calculate wizard position for new minion
              const wizardPos = calculateWizardPosition(minionPos, cameraControllerRef.current.getCurrentPosition());

              // Play teleport effect
              const oldWizardPos = wizard.mesh.position.clone();
              if (teleportEffectRef.current) {
                teleportEffectRef.current.playDisappear(oldWizardPos);
              }

              setTimeout(() => {
                wizard.mesh.position.copy(wizardPos);
                const dirToMinion = new THREE.Vector3()
                  .subVectors(minionPos, wizardPos)
                  .normalize();
                wizard.mesh.rotation.y = Math.atan2(dirToMinion.x, dirToMinion.z);

                if (teleportEffectRef.current) {
                  teleportEffectRef.current.playAppear(wizardPos);
                }

                // Trigger reaction on new minion
                if (newMinionData?.reactionIndicator) {
                  setTimeout(() => {
                    const reaction = getReactionForPersonality(newMinionData.personality);
                    newMinionData.reactionIndicator.show(reaction);
                  }, 300);
                }
              }, 200);

              // Trigger camera transition
              cameraControllerRef.current.transitionToMinion({
                minionPosition: minionPos,
                wizardPosition: wizardPos,
              });
            }
          } else {
            // Enter conversation mode
            enterConversation(minionId);

            // Tell wizard behavior we're in conversation
            wizardBehaviorRef.current?.enterConversation();

            // Calculate wizard position (left of minion, facing minion)
            const wizardPos = calculateWizardPosition(minionPos, cameraControllerRef.current.getCurrentPosition());

            // Play teleport effect at old position
            const oldWizardPos = wizard.mesh.position.clone();
            if (teleportEffectRef.current) {
              teleportEffectRef.current.playDisappear(oldWizardPos);
            }

            // Teleport wizard after brief delay (let disappear effect start)
            setTimeout(() => {
              wizard.mesh.position.copy(wizardPos);

              // Make wizard face the minion
              const dirToMinion = new THREE.Vector3()
                .subVectors(minionPos, wizardPos)
                .normalize();
              wizard.mesh.rotation.y = Math.atan2(dirToMinion.x, dirToMinion.z);

              // Play appear effect at new position
              if (teleportEffectRef.current) {
                teleportEffectRef.current.playAppear(wizardPos);
              }
              if (magicCircleRef.current) {
                magicCircleRef.current.show(wizardPos);
                setTimeout(() => magicCircleRef.current?.hide(), 500);
              }

              // Trigger minion reaction after wizard appears
              setTimeout(() => {
                if (minionData.reactionIndicator) {
                  const reaction = getReactionForPersonality(minionData.personality);
                  minionData.reactionIndicator.show(reaction);
                }
              }, 300);
            }, 200);

            // Trigger camera animation
            cameraControllerRef.current.enterConversation({
              minionPosition: minionPos,
              wizardPosition: wizardPos,
            });
          }
        }

        setSelectedMinion(minionId);
        onMinionClick?.(minionId);
        return;
      }
    }
  }, [setSelectedMinion, onMinionClick, onProjectClick, enterConversation, transitionToMinion]);

  // Keep ref in sync with latest callback (allows stable event listener)
  useEffect(() => {
    handleClickRef.current = handleClick;
  }, [handleClick]);

  // Get reaction based on minion personality
  const getReactionForPersonality = useCallback((personality: 'friendly' | 'cautious' | 'grumpy'): ReactionType => {
    switch (personality) {
      case 'friendly':
        return 'wave'; // Excited wave
      case 'cautious':
        return 'exclamation'; // Surprised
      case 'grumpy':
        return 'anger'; // Annoyed
      default:
        return 'exclamation';
    }
  }, []);

  // Calculate wizard position for conversation (in foreground, between camera and minion)
  // MMO-style: wizard in left foreground facing minion, minion in right background facing camera
  const calculateWizardPosition = useCallback((minionPos: THREE.Vector3, cameraPos: THREE.Vector3): THREE.Vector3 => {
    // Direction from camera to minion
    const cameraToMinion = new THREE.Vector3()
      .subVectors(minionPos, cameraPos)
      .normalize();

    // Wizard is positioned between camera and minion, offset to the right
    // This puts wizard in left foreground from camera's perspective
    const rightOffset = new THREE.Vector3()
      .crossVectors(cameraToMinion, new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(1.5); // Offset to the right

    // Position wizard further from minion for better framing
    const towardCamera = cameraToMinion.clone().multiplyScalar(-4.5); // 4.5 units toward camera (further from minion)
    const wizardPos = minionPos.clone().add(towardCamera).add(rightOffset);
    wizardPos.y = minionPos.y; // Same height as minion

    return wizardPos;
  }, []);

  // Create a Sims-style selection crystal (floating diamond above character)
  const createSelectionCrystal = useCallback((): THREE.Mesh => {
    const geometry = new THREE.OctahedronGeometry(0.3, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
      metalness: 0.3,
      roughness: 0.2,
    });
    const crystal = new THREE.Mesh(geometry, material);
    crystal.visible = false; // Hidden by default
    crystal.position.y = 3.5; // Float above minion head
    return crystal;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = null; // Sky environment will handle background
    sceneRef.current = scene;

    // === SKY ENVIRONMENT (gradient sky dome, clouds, stars) ===
    const skyEnvironment = new SkyEnvironment(scene, {
      domeRadius: 300,
      cloudCount: 14,
      starCount: 800,
      cloudDistanceMin: 60,
      cloudDistanceMax: 150,
      cloudHeightMin: -20,
      cloudHeightMax: 50,
    });
    skyEnvironmentRef.current = skyEnvironment;

    // Create camera controller (manages ortho/perspective switching)
    const cameraController = new CameraController(container, {
      isometricFrustumSize: 35,
      isometricDistance: 50,
      isometricPolarAngle: CAMERA_POLAR_ANGLE,
      conversationFov: 50,
      conversationDistance: 8,
      conversationHeight: 1.5,
      transitionDuration: 0.8,
    });
    cameraControllerRef.current = cameraController;

    // Get the orthographic camera for OrbitControls (used in isometric mode)
    const camera = cameraController.getOrthoCamera();
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Day/night cycle with rotating sun and dynamic lighting
    const dayNightCycle = new DayNightCycle(scene, {
      cycleDuration: 180, // 3 minute full day cycle
      sunOrbitRadius: 50,
      sunHeight: 40,
      shadowMapSize: 512, // Low res for pixelated low-poly shadows
      shadowFrustum: 50, // Tighter shadow frustum for smaller world
    });
    dayNightCycleRef.current = dayNightCycle;

    // Torch manager for minion torches at night
    const torchManager = new TorchManager();
    torchManagerRef.current = torchManager;

    // OrbitControls - pinned vertical axis (can rotate horizontally, not tilt)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 100;
    // Pin the vertical angle - can only rotate horizontally
    controls.minPolarAngle = CAMERA_POLAR_ANGLE;
    controls.maxPolarAngle = CAMERA_POLAR_ANGLE;
    controls.minZoom = 0.5;
    controls.maxZoom = 2.5;
    controlsRef.current = controls;

    // === COZY COTTAGE (single larger room) ===
    // Generate a single cozy cottage instead of multi-room compound
    const layoutGenerator = new LayoutGenerator(42, 8); // seed 42, grid size 8 for one big room
    const buildingLayout = layoutGenerator.generateCottage(); // Use cottage-specific generator

    const roomMeshBuilder = new RoomMeshBuilder();
    const buildingRefs = roomMeshBuilder.build(buildingLayout);

    // Calculate building bounds for exclusion zone and collision detection
    const layoutBounds = buildingLayout.bounds;
    const buildingPadding = 2;
    const buildingRadius = Math.max(
      Math.abs(layoutBounds.maxX - layoutBounds.minX),
      Math.abs(layoutBounds.maxZ - layoutBounds.minZ)
    ) / 2 + buildingPadding;

    buildingBoundsRef.current = {
      minX: layoutBounds.minX - 0.5,
      maxX: layoutBounds.maxX + 0.5,
      minZ: layoutBounds.minZ - 0.5,
      maxZ: layoutBounds.maxZ + 0.5,
      floorY: 0.3,
    };

    // === CONTINUOUS TERRAIN with building exclusion zone ===
    const terrainConfig = {
      ...DEFAULT_CONTINUOUS_CONFIG,
      exclusionZones: [
        { x: 0, z: 0, radius: buildingRadius + 3 } // Building area + margin
      ] as ExclusionZone[],
    };
    const terrainBuilder = new ContinuousTerrainBuilder(terrainConfig);
    const terrain = terrainBuilder.build();
    scene.add(terrain);
    terrainBuilderRef.current = terrainBuilder;

    // === FLOATING ISLAND EDGE (rocky cliffs around perimeter) ===
    // Find where the river exits the terrain for waterfall placement
    const riverPath = terrainBuilder.getRiverPath();
    let waterfallAngle = Math.PI * 0.75; // Default angle
    if (riverPath.length > 0) {
      // Find the last river segment (where it exits)
      const lastSegment = riverPath[riverPath.length - 1];
      waterfallAngle = Math.atan2(lastSegment.end.z, lastSegment.end.x);
    }

    const islandEdgeBuilder = new IslandEdgeBuilder({
      islandRadius: DEFAULT_CONTINUOUS_CONFIG.worldSize / 2,
      cliffDepth: 40,
      rimHeight: 14,
      bowlSegments: 20,
      waterfallAngle,
      waterfallWidth: 0.5,
    });
    const islandEdge = islandEdgeBuilder.build((x, z) => terrainBuilder.getHeightAt(x, z));
    scene.add(islandEdge);
    islandEdgeRef.current = islandEdge;

    // === WATERFALL (flowing off the island edge) ===
    const waterfallPos = islandEdgeBuilder.getWaterfallPosition();
    const waterfallOrigin = new THREE.Vector3(
      waterfallPos.x,
      terrainBuilder.getHeightAt(waterfallPos.x, waterfallPos.z) - 1,
      waterfallPos.z
    );
    const waterfallDirection = new THREE.Vector3(
      Math.cos(waterfallPos.angle),
      0,
      Math.sin(waterfallPos.angle)
    );
    const waterfall = new Waterfall(waterfallOrigin, waterfallDirection, {
      particleCount: 250,
      width: 8,
      fallDistance: 45,
      fallSpeed: 10,
      spreadFactor: 0.4,
      mistParticleCount: 60,
      waterColor: 0x4a9ed9,
      mistColor: 0xccddee,
    });
    scene.add(waterfall.getGroup());
    waterfallRef.current = waterfall;

    // Position building on terrain (at center, which is flat)
    const buildingY = terrainBuilder.getHeightAt(0, 0);
    buildingRefs.root.position.y = buildingY;
    scene.add(buildingRefs.root);

    // Update floorY to include terrain height
    buildingBoundsRef.current!.floorY = buildingY + 0.3;

    // Store interior lights for day/night control
    interiorLightsRef.current = buildingRefs.allLights;

    // Camera-relative wall culler - DISABLED for now (confusing behavior)
    // const wallCuller = new CameraRelativeWallCuller(camera);
    //
    // // Register walls and roofs from each room for culling
    // buildingRefs.rooms.forEach((roomRef, roomId) => {
    //   // Register each wall direction
    //   for (const dir of ['north', 'south', 'east', 'west'] as const) {
    //     const wallGroup = roomRef.walls[dir];
    //     if (wallGroup) {
    //       // Find the main wall mesh in the group
    //       wallGroup.traverse((child) => {
    //         if (child instanceof THREE.Mesh && child.userData.wallFace === dir) {
    //           wallCuller.registerWall(dir, child);
    //         }
    //       });
    //     }
    //   }
    //
    //   // Register roof for transparency when characters are inside
    //   if (roomRef.roof) {
    //     wallCuller.registerRoof(roomRef.roof);
    //   }
    // });
    // wallCullerRef.current = wallCuller;

    // === CLOUD SHADOWS (drifting across terrain for diffuse lighting) ===
    const cloudShadows: CloudShadowData[] = [];
    for (let i = 0; i < 5; i++) {
      // Create elliptical shadow shape
      const cloudSize = 15 + Math.random() * 20;
      const cloudGeo = new THREE.CircleGeometry(cloudSize, 8);
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.08 + Math.random() * 0.06,
        depthWrite: false,
      });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.rotation.x = -Math.PI / 2;
      cloud.position.y = 0.1; // Just above ground
      cloud.position.x = (Math.random() - 0.5) * WORLD_HALF_SIZE * 2;
      cloud.position.z = (Math.random() - 0.5) * WORLD_HALF_SIZE * 2;
      // Stretch into ellipse
      cloud.scale.set(1, 1, 0.6 + Math.random() * 0.4);
      cloud.renderOrder = -1;
      scene.add(cloud);

      cloudShadows.push({
        mesh: cloud,
        speed: new THREE.Vector2(
          0.5 + Math.random() * 1.0,
          0.2 + Math.random() * 0.5
        ),
        offset: new THREE.Vector2(cloud.position.x, cloud.position.z),
      });
    }
    cloudShadowsRef.current = cloudShadows;

    // === WILDLIFE (squirrels, rabbits hopping around) ===
    const wildlife: WildlifeData[] = [];

    // Create squirrel mesh
    function createSquirrel(): THREE.Group {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, flatShading: true });

      // Body
      const bodyGeo = new THREE.SphereGeometry(0.2, 6, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(1, 0.8, 1.2);
      body.position.y = 0.2;
      body.castShadow = true;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.12, 6, 4);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0, 0.3, 0.2);
      head.castShadow = true;
      group.add(head);

      // Ears (tiny cones)
      const earGeo = new THREE.ConeGeometry(0.04, 0.08, 4);
      const earL = new THREE.Mesh(earGeo, bodyMat);
      earL.position.set(-0.06, 0.42, 0.18);
      group.add(earL);
      const earR = new THREE.Mesh(earGeo, bodyMat);
      earR.position.set(0.06, 0.42, 0.18);
      group.add(earR);

      // Fluffy tail (curved cylinder approximation)
      const tailGeo = new THREE.SphereGeometry(0.15, 5, 4);
      const tail = new THREE.Mesh(tailGeo, bodyMat);
      tail.scale.set(0.6, 1.5, 0.6);
      tail.position.set(0, 0.35, -0.25);
      tail.rotation.x = 0.5;
      tail.castShadow = true;
      group.add(tail);

      // Legs (simple cylinders)
      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 4);
      const legFL = new THREE.Mesh(legGeo, bodyMat);
      legFL.position.set(-0.08, 0.06, 0.1);
      group.add(legFL);
      const legFR = new THREE.Mesh(legGeo, bodyMat);
      legFR.position.set(0.08, 0.06, 0.1);
      group.add(legFR);
      const legBL = new THREE.Mesh(legGeo, bodyMat);
      legBL.position.set(-0.1, 0.06, -0.1);
      group.add(legBL);
      const legBR = new THREE.Mesh(legGeo, bodyMat);
      legBR.position.set(0.1, 0.06, -0.1);
      group.add(legBR);

      return group;
    }

    // Create rabbit mesh
    function createRabbit(): THREE.Group {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc4a574, flatShading: true });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });

      // Body
      const bodyGeo = new THREE.SphereGeometry(0.25, 6, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(0.9, 0.8, 1.1);
      body.position.y = 0.22;
      body.castShadow = true;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.15, 6, 4);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0, 0.35, 0.22);
      head.castShadow = true;
      group.add(head);

      // Long ears
      const earGeo = new THREE.CapsuleGeometry(0.04, 0.2, 2, 4);
      const earL = new THREE.Mesh(earGeo, bodyMat);
      earL.position.set(-0.06, 0.55, 0.2);
      earL.rotation.x = -0.2;
      earL.rotation.z = -0.15;
      group.add(earL);
      const earR = new THREE.Mesh(earGeo, bodyMat);
      earR.position.set(0.06, 0.55, 0.2);
      earR.rotation.x = -0.2;
      earR.rotation.z = 0.15;
      group.add(earR);

      // Fluffy tail
      const tailGeo = new THREE.SphereGeometry(0.08, 5, 4);
      const tail = new THREE.Mesh(tailGeo, whiteMat);
      tail.position.set(0, 0.2, -0.28);
      tail.castShadow = true;
      group.add(tail);

      return group;
    }

    // Spawn wildlife in the forest areas
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 25; // In the forest, not clearing
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Clamp to world bounds
      if (Math.abs(x) < WORLD_HALF_SIZE * 0.9 && Math.abs(z) < WORLD_HALF_SIZE * 0.9) {
        const height = terrainBuilder.getHeightAt(x, z);
        const type = Math.random() > 0.5 ? 'squirrel' : 'rabbit';
        const mesh = type === 'squirrel' ? createSquirrel() : createRabbit();
        mesh.position.set(x, height, z);
        mesh.scale.setScalar(0.8 + Math.random() * 0.4);
        scene.add(mesh);

        wildlife.push({
          mesh,
          position: new THREE.Vector3(x, height, z),
          targetPosition: null,
          isMoving: false,
          idleTimer: 1 + Math.random() * 4,
          speed: 2.5 + Math.random() * 1.5,
          hopPhase: Math.random() * Math.PI * 2,
          type,
        });
      }
    }
    wildlifeRef.current = wildlife;

    // === MAGIC ORB (floating above building entrance) ===
    // Small glowing orb as a beacon/waypoint
    const orbGeometry = new THREE.IcosahedronGeometry(0.5, 1);
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0x9966ff,
      emissive: 0x6633cc,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.set(0, buildingY + 6, 0);
    orb.castShadow = true;
    scene.add(orb);

    // === PERMANENT WIZARD (always present, the player's avatar) ===
    const wizardInstance = createMinion({ species: 'wizard' });
    wizardInstance.mesh.position.set(5, buildingY + 0.5, 8); // In open area outside building
    wizardInstance.mesh.userData.isWizard = true;
    wizardInstance.mesh.castShadow = true;
    scene.add(wizardInstance.mesh);
    wizardRef.current = wizardInstance;

    // Wizard wandering behavior
    const wizardBehavior = new WizardBehavior({
      wanderRadius: 10,
      homePosition: new THREE.Vector3(5, buildingY + 0.5, 8),
      idleDurationMin: 2,
      idleDurationMax: 5,
      wanderSpeed: 1.2,
    });
    wizardBehaviorRef.current = wizardBehavior;

    // Wizard state for animation (will be set by behavior callbacks)
    let wizardIsInside = false;

    // Collect collision meshes for camera spring arm
    const collisionMeshes: THREE.Mesh[] = [];
    buildingRefs.rooms.forEach((roomRef) => {
      // Add walls as collision objects
      for (const dir of ['north', 'south', 'east', 'west'] as const) {
        const wallGroup = roomRef.walls[dir];
        if (wallGroup) {
          wallGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              collisionMeshes.push(child);
            }
          });
        }
      }
      // Add roof as collision
      if (roomRef.roof) {
        roomRef.roof.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            collisionMeshes.push(child);
          }
        });
      }
    });
    collisionMeshesRef.current = collisionMeshes;
    cameraController.setCollisionMeshes(collisionMeshes);

    // Create teleport effects
    const teleportEffect = new TeleportEffect({
      particleCount: 40,
      color: 0x9966ff,
      secondaryColor: 0xffcc00,
      duration: 0.4,
    });
    scene.add(teleportEffect.getGroup());

    teleportEffectRef.current = teleportEffect;

    // Create first person hands viewmodel (attached to perspective camera)
    const firstPersonHands = new FirstPersonHands();
    firstPersonHands.setVisible(false);
    // Get the perspective camera from camera controller and add hands to it
    // Camera must be in the scene for its children to be rendered
    const perspCamera = cameraController.getPerspCamera();
    scene.add(perspCamera);
    perspCamera.add(firstPersonHands.getObject());
    firstPersonHandsRef.current = firstPersonHands;

    const magicCircle = new MagicCircle(1.2, 0x9966ff);
    scene.add(magicCircle.getMesh());
    magicCircleRef.current = magicCircle;

    // === STAFF INTERACTION CONTROLLER (for first person force grab) ===
    const interactionController = new StaffInteractionController(perspCamera, scene);
    interactionControllerRef.current = interactionController;

    // Set up ground mesh for targeting and height function for foundation drawing
    interactionController.setGroundMesh(terrain);
    interactionController.setHeightFunction((x, z) => terrainBuilder.getHeightAt(x, z));

    // Set up interaction callbacks
    interactionController.setCallbacks({
      onMinionChat: (minionId) => {
        // Trigger chat with minion - switch to conversation mode
        const minionData = minionsRef.current.get(minionId);
        if (minionData) {
          setSelectedMinion(minionId);
          onMinionClick?.(minionId);
        }
      },
      onMinionQuest: (minionId) => {
        // Open quest assignment for minion
        setSelectedMinion(minionId);
        onMinionClick?.(minionId);
      },
      onBuildingStatus: (buildingId) => {
        onProjectClick?.(buildingId);
      },
      onBuildingWorkers: (buildingId) => {
        onProjectClick?.(buildingId);
      },
      onBuildingAesthetic: (buildingId) => {
        onProjectClick?.(buildingId);
      },
      onFoundationComplete: (foundation) => {
        onFoundationComplete?.(foundation);
      },
      onModeChange: (mode) => {
        onInteractionModeChange?.(mode);
        // Update menu options when mode changes
        if (mode === 'menu') {
          onMenuOptionsChange?.(interactionController.getMenuOptions());
        } else {
          onMenuOptionsChange?.(null);
        }
      },
      onStaffStateChange: (state) => {
        if (firstPersonHandsRef.current) {
          firstPersonHandsRef.current.setStaffState(state);
        }
      },
      onEntityThrown: (thrown) => {
        // Start tracking this minion's thrown physics
        const minionData = minionsRef.current.get(thrown.entityId);
        if (minionData) {
          // Set initial position from throw
          minionData.currentPosition.copy(thrown.position);
          minionData.instance.mesh.position.copy(thrown.position);

          // Random angular velocity for dramatic spinning
          const angularVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 15
          );

          thrownMinionsRef.current.set(thrown.entityId, {
            minionId: thrown.entityId,
            velocity: thrown.velocity.clone(),
            angularVelocity,
            bounceCount: 0,
          });
        }
      },
    });

    // Expose execute action callback to parent
    onInteractionControllerReady?.((actionId: string) => {
      interactionController.executeAction(actionId);
    });

    // Add click listener - use wrapper to avoid effect re-runs when handleClick changes
    const clickHandler = (event: MouseEvent) => handleClickRef.current?.(event);
    renderer.domElement.addEventListener('click', clickHandler);

    // === FIRST PERSON MODE INPUT HANDLING ===
    const fpController = cameraController.getFirstPersonController();

    // Toggle first person mode with Tab key
    function handleKeyDown(event: KeyboardEvent) {
      // Toggle first person mode
      if (event.code === 'Tab') {
        event.preventDefault();
        const conversation = useGameStore.getState().conversation;
        if (conversation.active) return; // Don't toggle during conversation

        if (cameraController.getMode() === 'firstPerson') {
          // Exit first person
          exitFirstPersonMode();
        } else if (cameraController.getMode() === 'isometric' && !cameraController.isTransitioning()) {
          // Enter first person
          enterFirstPersonMode();
        }
        return;
      }

      // Forward input to first person controller when in first person mode
      if (isFirstPersonRef.current) {
        fpController.handleKeyDown(event);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (isFirstPersonRef.current) {
        fpController.handleKeyUp(event);
      }
    }

    function handleMouseMove(event: MouseEvent) {
      if (isFirstPersonRef.current && document.pointerLockElement === renderer.domElement) {
        // Check if menu is open - if so, don't move camera, just track cursor
        const interactionMode = interactionControllerRef.current?.getMode();
        if (interactionMode === 'menu') {
          // Accumulate delta for look-to-select menu
          interactionControllerRef.current?.handleMouseMove(event);
          // Throttle React updates to every 50ms to avoid lag
          const now = performance.now();
          if (now - lastDeltaUpdateRef.current > 50) {
            lastDeltaUpdateRef.current = now;
            const delta = interactionControllerRef.current?.getSelectionDelta();
            if (delta) {
              onSelectionDeltaChange?.(delta);
            }
          }
        } else {
          // Normal camera movement
          fpController.handleMouseMove(event);

          // Apply sway to hands
          if (firstPersonHandsRef.current) {
            firstPersonHandsRef.current.setSway(event.movementX, event.movementY);
          }

          // Forward to interaction controller
          interactionControllerRef.current?.handleMouseMove(event);
        }
      }
    }

    function handleFirstPersonMouseDown(event: MouseEvent) {
      if (!isFirstPersonRef.current) return;
      interactionControllerRef.current?.handleMouseDown(event);
    }

    function handleFirstPersonMouseUp(event: MouseEvent) {
      if (!isFirstPersonRef.current) return;
      interactionControllerRef.current?.handleMouseUp(event);

      // Check if quick info should be shown
      const showQuickInfo = interactionControllerRef.current?.shouldShowQuickInfo() ?? false;
      onQuickInfoChange?.(showQuickInfo);
    }

    function handlePointerLockChange() {
      if (document.pointerLockElement !== renderer.domElement && isFirstPersonRef.current) {
        // Pointer lock was released while in first person - exit first person mode
        exitFirstPersonMode();
      }
    }

    function enterFirstPersonMode() {
      const wizard = wizardRef.current;
      if (!wizard || cameraController.isTransitioning()) return;

      // Stop wizard wandering behavior
      wizardBehaviorRef.current?.enterConversation(); // Reuse this to stop wandering

      // Get wizard position and rotation
      const wizardPos = wizard.mesh.position.clone();
      const wizardYaw = wizard.mesh.rotation.y;

      // Enter first person mode
      cameraController.enterFirstPerson(wizardPos, wizardYaw);
      isFirstPersonRef.current = true;

      // Update store camera mode
      useGameStore.getState().setCameraMode('firstPerson');

      // Hide wizard mesh (we're now the wizard)
      wizard.mesh.visible = false;

      // Show first person hands
      if (firstPersonHandsRef.current) {
        firstPersonHandsRef.current.setVisible(true);
      }

      // === FIRST PERSON OPTIMIZATIONS ===
      // Reduce shadow quality for better performance
      renderer.shadowMap.type = THREE.BasicShadowMap;
      if (dayNightCycleRef.current) {
        dayNightCycleRef.current.setShadowMapSize(256);
      }

      // Request pointer lock
      renderer.domElement.requestPointerLock();
    }

    function exitFirstPersonMode() {
      if (!isFirstPersonRef.current) return;

      // Exit pointer lock
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }

      // Get final position from first person controller
      const finalPos = fpController.getGroundPosition();
      const { yaw } = fpController.getRotation();

      // Update wizard position to where we walked to
      const wizard = wizardRef.current;
      if (wizard) {
        wizard.mesh.position.copy(finalPos);
        wizard.mesh.rotation.y = yaw;
        wizard.mesh.visible = true;

        // Update wizard behavior home position
        if (wizardBehaviorRef.current) {
          wizardBehaviorRef.current.exitConversation();
        }
      }

      // Hide first person hands
      if (firstPersonHandsRef.current) {
        firstPersonHandsRef.current.setVisible(false);
      }

      // Exit first person camera mode
      cameraController.exitFirstPerson();
      isFirstPersonRef.current = false;

      // === RESTORE ISOMETRIC QUALITY ===
      // Restore shadow quality
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (dayNightCycleRef.current) {
        dayNightCycleRef.current.setShadowMapSize(512);
      }

      // Update store camera mode
      useGameStore.getState().setCameraMode('isometric');
    }

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleFirstPersonMouseDown);
    document.addEventListener('mouseup', handleFirstPersonMouseUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Helper function to check if position is inside building
    function isInsideBuilding(x: number, z: number): boolean {
      const bounds = buildingBoundsRef.current;
      if (!bounds) return false;
      return x >= bounds.minX && x <= bounds.maxX &&
             z >= bounds.minZ && z <= bounds.maxZ;
    }

    // Helper function to get terrain height at position (or building floor if inside)
    function getGroundHeight(x: number, z: number): number {
      if (isInsideBuilding(x, z)) {
        return buildingBoundsRef.current!.floorY + 0.1; // Standing height on floor
      }
      return terrainBuilder.getHeightAt(x, z) + 0.1; // Standing height on terrain
    }

    // Helper function to select new destination
    function selectNewDestination(data: MinionSceneData): void {
      const halfSize = WORLD_HALF_SIZE * 0.8; // Stay within most of the cozy area

      // Pick a random point, avoiding building and water (unless on bridge)
      let targetX: number, targetZ: number;
      let attempts = 0;
      do {
        targetX = (Math.random() - 0.5) * halfSize * 2;
        targetZ = (Math.random() - 0.5) * halfSize * 2;
        attempts++;
      } while ((isInsideBuilding(targetX, targetZ) || !terrainBuilder.isWalkable(targetX, targetZ)) && attempts < 15);

      // If we found a valid spot, move there
      if (attempts < 15) {
        const targetY = getGroundHeight(targetX, targetZ);
        data.targetPosition = new THREE.Vector3(targetX, targetY, targetZ);
        data.isMoving = true;
      } else {
        // Couldn't find a valid spot, stay idle
        data.idleTimer = 1 + Math.random() * 2;
      }
    }

    // Set wizard behavior callbacks
    wizardBehavior.setCallbacks(getGroundHeight, isInsideBuilding);

    // Animation loop
    let lastTime = 0;
    function animate(time: number) {
      requestAnimationFrame(animate);
      const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const elapsedTime = time / 1000;

      // Reset object pools at start of frame
      resetAllPools();

      // Track performance
      performanceMonitor.recordFrameTime(deltaTime * 1000);

      // Update LOD manager with camera position
      lodManager.updateCamera(cameraController.getCamera());
      lodManager.setFirstPersonMode(isFirstPersonRef.current);

      // Update day/night cycle
      dayNightCycle.update(deltaTime);

      // Update torch manager based on time of day
      const timeOfDay = dayNightCycle.getTimeOfDay();
      torchManager.update(timeOfDay, deltaTime);

      // Update sky environment (gradient colors, clouds, stars)
      if (skyEnvironmentRef.current) {
        skyEnvironmentRef.current.update(timeOfDay, deltaTime);
      }

      // Update waterfall animation and colors
      if (waterfallRef.current) {
        waterfallRef.current.update(deltaTime);
        waterfallRef.current.setTimeOfDay(timeOfDay);
      }

      // Update interior lights based on time of day (throttled)
      // Night is roughly 0-0.22 and 0.78-1.0
      const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;
      const targetIntensity = isNight ? 1.0 : 0;

      // Only update lights at reduced frequency
      if (throttledUpdates.shouldUpdate('interior-lights', elapsedTime, UPDATE_INTERVALS.INTERIOR_LIGHTS)) {
        for (let i = 0; i < interiorLightsRef.current.length; i++) {
          const interiorLight = interiorLightsRef.current[i];
          updateInteriorLight(
            interiorLight.light,
            interiorLight.fixture,
            targetIntensity,
            deltaTime * 2, // Compensate for reduced update frequency
            `interior-${i}`
          );
        }
      }

      // Animate magic orb - gentle floating rotation
      orb.rotation.y += 0.008;
      orb.position.y = buildingY + 6 + Math.sin(elapsedTime * 0.8) * 0.3;

      // Animate cloud shadows - drift across terrain
      for (const cloud of cloudShadowsRef.current) {
        cloud.offset.x += cloud.speed.x * deltaTime;
        cloud.offset.y += cloud.speed.y * deltaTime;

        // Wrap around world bounds
        const halfWorld = WORLD_HALF_SIZE * 1.5;
        if (cloud.offset.x > halfWorld) cloud.offset.x = -halfWorld;
        if (cloud.offset.y > halfWorld) cloud.offset.y = -halfWorld;

        cloud.mesh.position.x = cloud.offset.x;
        cloud.mesh.position.z = cloud.offset.y;

        // Subtle opacity variation based on time
        const baseMat = cloud.mesh.material as THREE.MeshBasicMaterial;
        baseMat.opacity = 0.06 + Math.sin(elapsedTime * 0.3 + cloud.offset.x * 0.1) * 0.03;
      }

      // Animate wildlife (squirrels, rabbits hopping) - throttled AI updates
      const shouldUpdateWildlifeAI = throttledUpdates.shouldUpdate('wildlife-ai', elapsedTime, UPDATE_INTERVALS.WILDLIFE_AI);

      for (let i = 0; i < wildlifeRef.current.length; i++) {
        const animal = wildlifeRef.current[i];
        animal.hopPhase += deltaTime * (animal.isMoving ? 12 : 2);

        if (animal.isMoving && animal.targetPosition) {
          // Move toward target with hopping motion - use pooled vectors
          const dx = animal.targetPosition.x - animal.position.x;
          const dz = animal.targetPosition.z - animal.position.z;
          const horizontalDist = Math.sqrt(dx * dx + dz * dz);

          // Face movement direction
          if (horizontalDist > 0.01) {
            animal.mesh.rotation.y = Math.atan2(dx, dz);
          }

          const moveDistance = animal.speed * deltaTime;

          if (horizontalDist < moveDistance) {
            // Reached destination
            animal.position.copy(animal.targetPosition);
            animal.isMoving = false;
            animal.targetPosition = null;
            animal.idleTimer = randomRange(2, 7);
          } else {
            // Calculate next position inline (no vector allocation)
            const scale = moveDistance / horizontalDist;
            const nextX = animal.position.x + dx * scale;
            const nextZ = animal.position.z + dz * scale;

            // Check if next position is walkable (cached)
            if (walkabilityCache.isWalkable(nextX, nextZ, (x, z) => terrainBuilder.isWalkable(x, z))) {
              animal.position.x = nextX;
              animal.position.z = nextZ;
              animal.position.y = terrainBuilder.getHeightAt(nextX, nextZ);
            } else {
              animal.isMoving = false;
              animal.targetPosition = null;
              animal.idleTimer = randomRange(0.5, 1.5);
            }
          }

          // Hopping bounce
          const hopHeight = Math.abs(Math.sin(animal.hopPhase)) * 0.4;
          animal.mesh.position.set(
            animal.position.x,
            animal.position.y + hopHeight,
            animal.position.z
          );
          animal.mesh.rotation.x = Math.sin(animal.hopPhase) * 0.15;

        } else {
          // Idle - occasional small movements (only check AI at throttled rate)
          animal.idleTimer -= deltaTime;

          if (animal.idleTimer <= 0 && shouldUpdateWildlifeAI) {
            // Pick new nearby target - try up to 5 times to find walkable spot
            let foundTarget = false;
            for (let attempt = 0; attempt < 5 && !foundTarget; attempt++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = randomRange(3, 11);
              const targetX = animal.position.x + Math.cos(angle) * dist;
              const targetZ = animal.position.z + Math.sin(angle) * dist;

              // Keep in bounds, away from building, and on walkable terrain (cached)
              if (Math.abs(targetX) < WORLD_HALF_SIZE * 0.85 &&
                  Math.abs(targetZ) < WORLD_HALF_SIZE * 0.85 &&
                  Math.sqrt(targetX * targetX + targetZ * targetZ) > 12 &&
                  walkabilityCache.isWalkable(targetX, targetZ, (x, z) => terrainBuilder.isWalkable(x, z))) {
                const targetY = terrainBuilder.getHeightAt(targetX, targetZ);
                // Reuse targetPosition if it exists, otherwise create new
                if (animal.targetPosition) {
                  animal.targetPosition.set(targetX, targetY, targetZ);
                } else {
                  animal.targetPosition = new THREE.Vector3(targetX, targetY, targetZ);
                }
                animal.isMoving = true;
                foundTarget = true;
              }
            }
            if (!foundTarget) {
              animal.idleTimer = randomRange(1, 3);
            }
          }

          // Gentle idle animation
          const idleBob = Math.sin(elapsedTime * 2 + animal.hopPhase) * 0.02;
          animal.mesh.position.y = animal.position.y + idleBob;
          animal.mesh.rotation.x = 0;
        }
      }

      // === FIRST PERSON MODE UPDATE ===
      if (isFirstPersonRef.current && cameraController.getMode() === 'firstPerson') {
        // Update first person controller with terrain and collision
        // Only update camera movement if not in menu mode
        const interactionMode = interactionControllerRef.current?.getMode();
        if (interactionMode !== 'menu') {
          cameraController.updateFirstPerson(deltaTime, terrainBuilder, collisionMeshesRef.current);
        }

        // Update first person hands animation
        if (firstPersonHandsRef.current) {
          const isMoving = fpController.isMoving();
          const speed = fpController.getVelocity().length() / 5; // Normalize to 0-1ish
          firstPersonHandsRef.current.setBobbing(isMoving, speed);
          firstPersonHandsRef.current.update(deltaTime, elapsedTime);
        }

        // Update interaction controller (targeting, force grab physics, etc.)
        if (interactionControllerRef.current) {
          interactionControllerRef.current.update(deltaTime);

          // Update quick info visibility
          const showQuickInfo = interactionControllerRef.current.shouldShowQuickInfo();
          const target = interactionControllerRef.current.getCurrentTarget();
          if (showQuickInfo && target) {
            onQuickInfoChange?.(true);
          }

          // Notify parent of target changes
          onTargetChange?.(target);
        }

        // Skip wizard wandering updates when in first person
        wizardIsInside = false; // Don't affect wall culling
      } else {
        // Update wizard wandering behavior (only when not in first person)
        const wizardMovement = wizardBehavior.update(
          deltaTime,
          wizardInstance.mesh.position
        );

        let wizardIsMoving = false;
        if (wizardMovement && !teleportEffect.isActive()) {
          wizardIsMoving = wizardMovement.isMoving;

          // Move wizard to new position
          wizardInstance.mesh.position.x = wizardMovement.targetPosition.x;
          wizardInstance.mesh.position.z = wizardMovement.targetPosition.z;

          // Face movement direction
          if (wizardIsMoving) {
            const dir = new THREE.Vector3()
              .subVectors(wizardMovement.targetPosition, wizardInstance.mesh.position);
            if (dir.lengthSq() > 0.001) {
              wizardInstance.mesh.rotation.y = Math.atan2(dir.x, dir.z);
            }
          }
        }

        // Animate wizard
        wizardInstance.animator.update(deltaTime, elapsedTime, wizardIsMoving);
        wizardIsInside = isInsideBuilding(
          wizardInstance.mesh.position.x,
          wizardInstance.mesh.position.z
        );

        // Apply bob/bounce (only if not teleporting)
        if (!teleportEffect.isActive()) {
          const bounce = wizardInstance.animator.getBounce();
          const baseY = getGroundHeight(
            wizardInstance.mesh.position.x,
            wizardInstance.mesh.position.z
          );
          wizardInstance.mesh.position.y = baseY + bounce;
        }
      }

      // Update teleport effects
      teleportEffect.update(deltaTime);
      magicCircle.update(deltaTime);

      // Track if any character is inside the building (wizard or minion)
      let anyCharacterInside = wizardIsInside;

      // Get current conversation state
      const conversationState = useGameStore.getState().conversation;
      const inConversation = conversationState.active;

      // Update thrown minions physics (only if there are any)
      if (thrownMinionsRef.current.size > 0) {
        const GRAVITY = 35;
        const BOUNCE_DAMPING = 0.55;
        const MIN_BOUNCE_VELOCITY = 2;
        const MAX_BOUNCES = 4;
        const worldLimit = WORLD_HALF_SIZE * 0.95;

        thrownMinionsRef.current.forEach((thrown, minionId) => {
          const minionData = minionsRef.current.get(minionId);
          if (!minionData) {
            thrownMinionsRef.current.delete(minionId);
            return;
          }

          // Apply gravity and update position inline (no cloning)
          thrown.velocity.y -= GRAVITY * deltaTime;
          minionData.currentPosition.x += thrown.velocity.x * deltaTime;
          minionData.currentPosition.y += thrown.velocity.y * deltaTime;
          minionData.currentPosition.z += thrown.velocity.z * deltaTime;

          // Get ground height
          const groundY = getGroundHeight(minionData.currentPosition.x, minionData.currentPosition.z);

          // Bounce on ground collision
          if (minionData.currentPosition.y <= groundY && thrown.velocity.y < 0) {
            thrown.bounceCount++;
            minionData.currentPosition.y = groundY;
            thrown.velocity.y = -thrown.velocity.y * BOUNCE_DAMPING;
            thrown.velocity.x = thrown.velocity.x * 0.7 + (Math.random() - 0.5) * 3;
            thrown.velocity.z = thrown.velocity.z * 0.7 + (Math.random() - 0.5) * 3;
            thrown.angularVelocity.x += (Math.random() - 0.5) * 10;
            thrown.angularVelocity.z += (Math.random() - 0.5) * 10;

            if (Math.abs(thrown.velocity.y) < MIN_BOUNCE_VELOCITY || thrown.bounceCount >= MAX_BOUNCES) {
              minionData.currentPosition.y = groundY;
              minionData.instance.mesh.position.copy(minionData.currentPosition);
              minionData.instance.mesh.rotation.set(0, minionData.instance.mesh.rotation.y, 0);
              minionData.isMoving = false;
              minionData.idleTimer = 2 + Math.random() * 2;
              thrownMinionsRef.current.delete(minionId);
              return;
            }
          }

          // World bounds
          if (Math.abs(minionData.currentPosition.x) > worldLimit) {
            minionData.currentPosition.x = Math.sign(minionData.currentPosition.x) * worldLimit;
            thrown.velocity.x *= -0.5;
          }
          if (Math.abs(minionData.currentPosition.z) > worldLimit) {
            minionData.currentPosition.z = Math.sign(minionData.currentPosition.z) * worldLimit;
            thrown.velocity.z *= -0.5;
          }

          // Update mesh
          minionData.instance.mesh.position.copy(minionData.currentPosition);
          minionData.instance.mesh.rotation.x += thrown.angularVelocity.x * deltaTime;
          minionData.instance.mesh.rotation.y += thrown.angularVelocity.y * deltaTime;
          minionData.instance.mesh.rotation.z += thrown.angularVelocity.z * deltaTime;
          thrown.angularVelocity.multiplyScalar(0.98);
        });
      }

      // Animate minions
      const grabbedMinionId = interactionControllerRef.current?.getGrabbedEntityId();
      const suspendedMinionId = interactionControllerRef.current?.getSuspendedEntityId();
      const hasThrownMinions = thrownMinionsRef.current.size > 0;
      minionsRef.current.forEach((data) => {
        // Skip if being thrown (physics handled above) - only check if there are thrown minions
        const isThrown = hasThrownMinions && thrownMinionsRef.current.has(data.minionId);

        // Check if this minion is being force grabbed or suspended (menu open)
        const isGrabbed = grabbedMinionId === data.minionId;
        const isSuspended = suspendedMinionId === data.minionId;

        // Check if this minion is in conversation
        const isConversing = inConversation && conversationState.minionId === data.minionId;

        // Skip normal updates if thrown (physics handled separately)
        if (isThrown) {
          // Just update animator for flailing effect
          data.instance.animator.update(deltaTime, elapsedTime, false);

          // Chaotic limb flailing during flight
          const refs = data.instance.refs;
          const flailSpeed = 15;
          const flailAmount = 1.2;
          if (refs.leftHand) {
            refs.leftHand.rotation.x = Math.sin(elapsedTime * flailSpeed) * flailAmount;
            refs.leftHand.rotation.z = Math.cos(elapsedTime * flailSpeed * 0.7) * flailAmount;
          }
          if (refs.rightHand) {
            refs.rightHand.rotation.x = Math.sin(elapsedTime * flailSpeed + Math.PI) * flailAmount;
            refs.rightHand.rotation.z = Math.cos(elapsedTime * flailSpeed * 0.7 + Math.PI) * flailAmount;
          }
          if (refs.leftLeg) {
            refs.leftLeg.rotation.x = Math.sin(elapsedTime * flailSpeed * 0.9) * flailAmount;
          }
          if (refs.rightLeg) {
            refs.rightLeg.rotation.x = Math.sin(elapsedTime * flailSpeed * 0.9 + Math.PI) * flailAmount;
          }
          return; // Skip rest of normal minion logic
        }

        // Update animator (not moving if conversing, grabbed, or suspended)
        data.instance.animator.update(deltaTime, elapsedTime, data.isMoving && !isConversing && !isGrabbed && !isSuspended);

        // If grabbed or suspended (menu open), apply ragdoll effect
        // Grabbed: ForceGrabController handles position
        // Suspended: hover in place with spin
        if (isGrabbed || isSuspended) {
          const refs = data.instance.refs;
          const mesh = data.instance.mesh;

          // Chaotic limb flailing
          const flailSpeed = 12;
          const flailAmount = 0.8;
          if (refs.leftHand) {
            refs.leftHand.rotation.x = Math.sin(elapsedTime * flailSpeed) * flailAmount;
            refs.leftHand.rotation.z = Math.cos(elapsedTime * flailSpeed * 0.7) * flailAmount * 0.5;
          }
          if (refs.rightHand) {
            refs.rightHand.rotation.x = Math.sin(elapsedTime * flailSpeed + Math.PI) * flailAmount;
            refs.rightHand.rotation.z = Math.cos(elapsedTime * flailSpeed * 0.7 + Math.PI) * flailAmount * 0.5;
          }
          if (refs.leftLeg) {
            refs.leftLeg.rotation.x = Math.sin(elapsedTime * flailSpeed * 0.8) * flailAmount * 0.6;
          }
          if (refs.rightLeg) {
            refs.rightLeg.rotation.x = Math.sin(elapsedTime * flailSpeed * 0.8 + Math.PI) * flailAmount * 0.6;
          }

          // For suspended (not grabbed), we control position/rotation here
          // Grabbed minions have position handled by ForceGrabController
          if (isSuspended && !isGrabbed) {
            // Hover up slightly and spin
            const hoverHeight = 0.5 + Math.sin(elapsedTime * 2) * 0.1;
            mesh.position.y = data.currentPosition.y + hoverHeight;

            // Spin and wobble
            mesh.rotation.y += deltaTime * 2; // Gentle spin
            mesh.rotation.x = Math.sin(elapsedTime * 3) * 0.2;
            mesh.rotation.z = Math.cos(elapsedTime * 2.5) * 0.15;
          }

          return; // Skip all normal movement logic
        }

        // Check if inside building
        data.isInsideBuilding = isInsideBuilding(
          data.currentPosition.x,
          data.currentPosition.z
        );
        if (data.isInsideBuilding) {
          anyCharacterInside = true;
        }

        // Update reaction indicator
        data.reactionIndicator.update(deltaTime);

        // Skip movement if conversing - minion stays still and faces wizard
        if (isConversing) {
          // Face the wizard during conversation (no allocation)
          const wizard = wizardRef.current;
          if (wizard) {
            const dx = wizard.mesh.position.x - data.currentPosition.x;
            const dz = wizard.mesh.position.z - data.currentPosition.z;
            data.instance.mesh.rotation.y = Math.atan2(dx, dz);
          }

          // Apply position with gentle idle bob
          const bounce = data.instance.animator.getBounce();
          data.instance.mesh.position.set(
            data.currentPosition.x,
            data.currentPosition.y + bounce,
            data.currentPosition.z
          );
          return; // Skip normal movement logic
        }

        if (data.isMoving && data.targetPosition) {
          // Calculate direction to target (no allocation - inline math)
          const dx = data.targetPosition.x - data.currentPosition.x;
          const dz = data.targetPosition.z - data.currentPosition.z;
          const horizontalDist = Math.sqrt(dx * dx + dz * dz);

          // Face movement direction
          if (horizontalDist > 0.01) {
            data.instance.mesh.rotation.y = Math.atan2(dx, dz);
          }

          // Move toward target
          const moveDistance = data.speed * deltaTime;

          if (horizontalDist < moveDistance) {
            // Reached destination
            data.currentPosition.copy(data.targetPosition);
            data.isMoving = false;
            data.targetPosition = null;
            data.idleTimer = randomRange(1, 4);
          } else {
            // Calculate next position inline (no vector allocation)
            const scale = moveDistance / horizontalDist;
            const nextX = data.currentPosition.x + dx * scale;
            const nextZ = data.currentPosition.z + dz * scale;

            // Check if next position is walkable (cached)
            if (walkabilityCache.isWalkable(nextX, nextZ, (x, z) => terrainBuilder.isWalkable(x, z))) {
              data.currentPosition.x = nextX;
              data.currentPosition.z = nextZ;
              data.currentPosition.y = getGroundHeight(nextX, nextZ);
            } else {
              // Hit water - stop and pick a new destination
              data.isMoving = false;
              data.targetPosition = null;
              data.idleTimer = randomRange(0.5, 1.5);
            }
          }

          // Apply position with bounce from animator
          const bounce = data.instance.animator.getBounce();
          data.instance.mesh.position.set(
            data.currentPosition.x,
            data.currentPosition.y + bounce,
            data.currentPosition.z
          );

        } else if (!data.isMoving) {
          // Idle countdown
          data.idleTimer -= deltaTime;
          if (data.idleTimer <= 0) {
            selectNewDestination(data);
          }

          // Apply position with gentle bob from animator
          const bounce = data.instance.animator.getBounce();
          data.instance.mesh.position.set(
            data.currentPosition.x,
            data.currentPosition.y + bounce,
            data.currentPosition.z
          );
        }

        // Animate selection crystal (bob and rotate)
        if (data.selectionCrystal.visible) {
          data.selectionCrystal.rotation.y = elapsedTime * 2;
          data.selectionCrystal.position.y = 3.5 + Math.sin(elapsedTime * 3) * 0.15;
        }
      });

      // Update wall culler with character-inside state - DISABLED
      // if (wallCullerRef.current) {
      //   wallCullerRef.current.setCharacterInside(anyCharacterInside);
      //   wallCullerRef.current.update(deltaTime);
      // }

      // Update camera controller
      cameraController.update(deltaTime);

      // Handle controls based on camera mode
      if (cameraController.getMode() === 'isometric' && !cameraController.isTransitioning()) {
        // Clamp camera target to terrain bounds
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, -WORLD_HALF_SIZE * 0.9, WORLD_HALF_SIZE * 0.9);
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, -WORLD_HALF_SIZE * 0.9, WORLD_HALF_SIZE * 0.9);

        controls.enabled = true;
        controls.update();

        // Sync camera controller with orbit controls
        cameraController.syncFromOrbitControls(controls.target);
      } else {
        // Disable orbit controls during conversation/transition
        controls.enabled = false;
      }

      // Render with the active camera
      const activeCamera = cameraController.getCamera();
      renderer.render(scene, activeCamera);
    }
    animate(0);

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      cameraController.handleResize(width, height);
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleFirstPersonMouseDown);
      document.removeEventListener('mouseup', handleFirstPersonMouseUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      renderer.domElement.removeEventListener('click', clickHandler);
      controls.dispose();
      renderer.dispose();
      roomMeshBuilder.dispose();
      terrainBuilderRef.current?.dispose();
      dayNightCycleRef.current?.dispose();
      torchManagerRef.current?.dispose();
      skyEnvironmentRef.current?.dispose();
      waterfallRef.current?.dispose();
      interactionControllerRef.current?.dispose();
      if (islandEdgeRef.current) {
        scene.remove(islandEdgeRef.current);
      }
      cameraControllerRef.current?.dispose();
      teleportEffectRef.current?.dispose();
      magicCircleRef.current?.dispose();
      firstPersonHandsRef.current?.dispose();
      wizardInstance.dispose();
      // Cleanup wildlife
      for (const animal of wildlifeRef.current) {
        scene.remove(animal.mesh);
      }
      wildlifeRef.current = [];
      // Cleanup cloud shadows
      for (const cloud of cloudShadowsRef.current) {
        scene.remove(cloud.mesh);
      }
      cloudShadowsRef.current = [];
      // Cleanup project buildings
      projectBuildingsRef.current.forEach((building) => {
        scene.remove(building.group);
        building.dispose();
      });
      projectBuildingsRef.current.clear();
      // Cleanup village paths
      if (villagePathsRef.current) {
        scene.remove(villagePathsRef.current);
        villagePathsRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        villagePathsRef.current = null;
      }
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - handleClick accessed via ref to avoid scene recreation

  // Sync minions with store (wait for hydration to ensure persisted data is loaded)
  useEffect(() => {
    if (!hasHydrated || !sceneRef.current || !terrainBuilderRef.current) return;

    const scene = sceneRef.current;
    const currentMinions = minionsRef.current;
    const terrain = terrainBuilderRef.current;

    // Helper to get ground height
    function getGroundHeight(x: number, z: number): number {
      const bounds = buildingBoundsRef.current;
      if (bounds && x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ) {
        return bounds.floorY + 0.1;
      }
      return terrain.getHeightAt(x, z) + 0.1;
    }

    // Available minion species (not wizard/witch - those are player characters)
    const minionSpecies = ['goblin', 'penguin', 'mushroom'] as const;

    // Add new minions
    minions.forEach((minion, index) => {
      if (!currentMinions.has(minion.id)) {
        // Create minion using the factory - pick species based on index for variety
        const species = minionSpecies[index % minionSpecies.length];
        const instance = createMinion({ species });

        // Find a random start position outside the building
        let startX: number, startZ: number;
        do {
          startX = (Math.random() - 0.5) * 20;
          startZ = (Math.random() - 0.5) * 20;
        } while (buildingBoundsRef.current &&
                 startX >= buildingBoundsRef.current.minX &&
                 startX <= buildingBoundsRef.current.maxX &&
                 startZ >= buildingBoundsRef.current.minZ &&
                 startZ <= buildingBoundsRef.current.maxZ);

        const startY = getGroundHeight(startX, startZ);
        const startPos = new THREE.Vector3(startX, startY, startZ);

        instance.mesh.position.copy(startPos);
        instance.mesh.userData.minionId = minion.id;

        // Equip knight helmet on goblins (not wizards)
        if (species === 'goblin' && index % 2 === 0) {
          instance.equipGear(knightHelmetConfig);
        }

        // Create and attach torch to minions (goblins carry torches for night exploration)
        const torchId = `torch_${minion.id}`;
        if (torchManagerRef.current) {
          const torch = torchManagerRef.current.createTorch(torchId, {
            color: 0xff9944,
            intensity: 1.2,
            distance: 10,
            decay: 2,
            castShadow: false, // Disabled to stay within WebGL texture limits
            shadowMapSize: 64,
          });

          // Attach to left hand for goblins (right hand may have helmet/gear)
          const leftHandAttach = instance.refs.attachments.get('left_hand');
          if (leftHandAttach) {
            torch.group.position.set(0, 0.2, 0); // Offset above hand
            leftHandAttach.add(torch.group);
          } else {
            // Fallback: attach to mesh root with manual positioning
            torch.group.position.set(-0.4, 0.8, 0.2);
            instance.mesh.add(torch.group);
          }
        }

        scene.add(instance.mesh);

        // Create reaction indicator for this minion
        const reactionIndicator = new ReactionIndicator();
        instance.mesh.add(reactionIndicator.getGroup());

        // Create Sims-style selection crystal
        const selectionCrystal = createSelectionCrystal();
        instance.mesh.add(selectionCrystal);

        // Assign personality based on traits or random
        const personalities: Array<'friendly' | 'cautious' | 'grumpy'> = ['friendly', 'cautious', 'grumpy'];
        const personality = personalities[index % personalities.length];

        currentMinions.set(minion.id, {
          minionId: minion.id,
          instance,
          currentPosition: startPos.clone(),
          targetPosition: null,
          isMoving: false,
          idleTimer: Math.random() * 2,
          speed: 2.0 + Math.random() * 0.5,
          isInsideBuilding: false,
          torchId,
          reactionIndicator,
          personality,
          selectionCrystal,
        });

        // Register with interaction controller
        interactionControllerRef.current?.registerMinion(minion.id, instance.mesh, {
          name: minion.name,
          state: minion.state,
          personality,
        });
      }
    });

    // Remove minions that no longer exist
    currentMinions.forEach((data, minionId) => {
      if (!minions.find((m) => m.id === minionId)) {
        scene.remove(data.instance.mesh);
        data.instance.dispose();
        data.reactionIndicator.dispose();
        // Remove associated torch
        if (torchManagerRef.current) {
          torchManagerRef.current.removeTorch(data.torchId);
        }
        // Unregister from interaction controller
        interactionControllerRef.current?.unregisterEntity(minionId);
        currentMinions.delete(minionId);
      }
    });

    // Update selected state (show/hide Sims-style crystal)
    currentMinions.forEach((data) => {
      const isSelected = data.minionId === selectedMinionId;
      data.selectionCrystal.visible = isSelected;
    });
  }, [hasHydrated, minions, selectedMinionId]);

  // Handle conversation phase changes
  useEffect(() => {
    if (!cameraControllerRef.current) return;

    // When exiting conversation, trigger camera return animation
    if (conversation.phase === 'exiting') {
      cameraControllerRef.current.exitConversation();

      // Exit wizard conversation mode and teleport back near home
      if (wizardBehaviorRef.current && wizardRef.current && teleportEffectRef.current) {
        const wizard = wizardRef.current;
        const oldPos = wizard.mesh.position.clone();

        // Play teleport effect
        teleportEffectRef.current.playDisappear(oldPos);

        // Teleport wizard back near cottage after delay
        setTimeout(() => {
          wizard.mesh.position.set(0, 0.5, 2);
          teleportEffectRef.current?.playAppear(wizard.mesh.position);
          wizardBehaviorRef.current?.exitConversation();
        }, 200);
      }

      // Clear conversation state after animation completes
      const timer = setTimeout(() => {
        setConversationPhase(null);
      }, 1000); // Match transition duration

      return () => clearTimeout(timer);
    }

    // When entering conversation, wait for camera transition to complete
    if (conversation.phase === 'entering') {
      // Set phase to active after transition duration completes
      // Don't check isTransitioning() since camera might be in edge case position
      const timer = setTimeout(() => {
        setConversationPhase('active');
      }, 900); // Slightly after transition duration (0.8s)

      return () => clearTimeout(timer);
    }
  }, [conversation.phase, setConversationPhase]);

  // Initial project scan and polling
  useEffect(() => {
    scanProjects();
    const interval = setInterval(() => {
      scanProjects();
    }, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [scanProjects]);

  // Sync project buildings with scene
  useEffect(() => {
    if (!sceneRef.current || !terrainBuilderRef.current) return;

    const scene = sceneRef.current;
    const terrain = terrainBuilderRef.current;
    const currentBuildings = projectBuildingsRef.current;

    // Track if we need to rebuild village paths
    let buildingsChanged = false;

    // Add new project buildings
    for (const project of projects) {
      if (!currentBuildings.has(project.id)) {
        // Calculate position - use stored position from project or generate one
        const pos = new THREE.Vector3(
          project.building.position.x,
          terrain.getHeightAt(project.building.position.x, project.building.position.z),
          project.building.position.z
        );

        const building = createProjectBuilding(project, pos);
        scene.add(building.group);
        currentBuildings.set(project.id, building);
        buildingsChanged = true;

        // Register with interaction controller
        interactionControllerRef.current?.registerBuilding(project.id, building.group, {
          name: project.name,
          buildingType: project.building.type,
        });
      }
    }

    // Remove buildings that no longer exist
    currentBuildings.forEach((building, projectId) => {
      if (!projects.find((p) => p.id === projectId)) {
        scene.remove(building.group);
        building.dispose();
        // Unregister from interaction controller
        interactionControllerRef.current?.unregisterEntity(projectId);
        currentBuildings.delete(projectId);
        buildingsChanged = true;
      }
    });

    // Rebuild village paths if buildings changed
    if (buildingsChanged || !villagePathsRef.current) {
      // Remove old paths
      if (villagePathsRef.current) {
        scene.remove(villagePathsRef.current);
        villagePathsRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }

      // Create new village paths based on building positions
      const buildingPositions = projects.map((p) => ({
        x: p.building.position.x,
        z: p.building.position.z,
      }));

      if (buildingPositions.length > 0) {
        const villagePaths = createVillagePaths(
          buildingPositions,
          (x, z) => terrain.getHeightAt(x, z)
        );
        scene.add(villagePaths);
        villagePathsRef.current = villagePaths;
      }
    }
  }, [projects]);

  // Update selected project building highlight
  useEffect(() => {
    projectBuildingsRef.current.forEach((building, projectId) => {
      setProjectBuildingSelected(building, projectId === selectedProjectId);
    });
  }, [selectedProjectId]);

  // Expose exit conversation for UI components
  const handleLeaveConversation = useCallback(() => {
    exitConversation();
  }, [exitConversation]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'pointer' }} />;
}
