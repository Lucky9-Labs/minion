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
import { LayoutGenerator, RoomMeshBuilder } from '@/lib/building';
import type { BuildingRefs, RoomMeshRefs, InteriorLight } from '@/lib/building/RoomMeshBuilder';
import { DayNightCycle, TorchManager } from '@/lib/lighting';
import { CameraController } from '@/lib/camera';
import { TeleportEffect, MagicCircle, ReactionIndicator } from '@/lib/effects';
import type { ReactionType } from '@/lib/effects';
import { WizardBehavior } from '@/lib/wizard';

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
}

// Building bounds for collision and inside detection
interface BuildingBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorY: number;
}

// Camera bounds from continuous terrain
const WORLD_HALF_SIZE = DEFAULT_CONTINUOUS_CONFIG.worldSize / 2;

// Fixed camera angle (isometric-ish view)
const CAMERA_POLAR_ANGLE = Math.PI / 4; // 45 degrees from vertical

interface SimpleSceneProps {
  onMinionClick?: (minionId: string) => void;
}

export function SimpleScene({ onMinionClick }: SimpleSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const minionsRef = useRef<Map<string, MinionSceneData>>(new Map());
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

  const hasHydrated = useHasHydrated();
  const minions = useGameStore((state) => state.minions);
  const selectedMinionId = useGameStore((state) => state.selectedMinionId);
  const setSelectedMinion = useGameStore((state) => state.setSelectedMinion);
  const conversation = useGameStore((state) => state.conversation);
  const enterConversation = useGameStore((state) => state.enterConversation);
  const exitConversation = useGameStore((state) => state.exitConversation);
  const setConversationPhase = useGameStore((state) => state.setConversationPhase);
  const transitionToMinion = useGameStore((state) => state.transitionToMinion);

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
  }, [setSelectedMinion, onMinionClick, enterConversation, transitionToMinion]);

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

  // Calculate wizard position for conversation (left of minion from camera's view)
  const calculateWizardPosition = useCallback((minionPos: THREE.Vector3, cameraPos: THREE.Vector3): THREE.Vector3 => {
    // Direction from camera to minion
    const cameraToMinion = new THREE.Vector3()
      .subVectors(minionPos, cameraPos)
      .normalize();

    // Left offset (perpendicular to camera direction)
    const leftOffset = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), cameraToMinion)
      .normalize()
      .multiplyScalar(2.5);

    // Position wizard to the left of minion
    const wizardPos = minionPos.clone().add(leftOffset);
    wizardPos.y = minionPos.y; // Same height as minion

    return wizardPos;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    sceneRef.current = scene;

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

    // Position building on terrain (at center, which is flat)
    const buildingY = terrainBuilder.getHeightAt(0, 0);
    buildingRefs.root.position.y = buildingY;
    scene.add(buildingRefs.root);

    // Store interior lights for day/night control
    interiorLightsRef.current = buildingRefs.allLights;

    // Camera-relative wall culler - register walls from all rooms
    const wallCuller = new CameraRelativeWallCuller(camera);

    // Register walls and roofs from each room for culling
    buildingRefs.rooms.forEach((roomRef, roomId) => {
      // Register each wall direction
      for (const dir of ['north', 'south', 'east', 'west'] as const) {
        const wallGroup = roomRef.walls[dir];
        if (wallGroup) {
          // Find the main wall mesh in the group
          wallGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.wallFace === dir) {
              wallCuller.registerWall(dir, child);
            }
          });
        }
      }

      // Register roof for transparency when characters are inside
      if (roomRef.roof) {
        wallCuller.registerRoof(roomRef.roof);
      }
    });
    wallCullerRef.current = wallCuller;

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
    wizardInstance.mesh.position.set(0, buildingY + 0.5, 2); // Near cottage entrance
    wizardInstance.mesh.userData.isWizard = true;
    wizardInstance.mesh.castShadow = true;
    scene.add(wizardInstance.mesh);
    wizardRef.current = wizardInstance;

    // Wizard wandering behavior
    const wizardBehavior = new WizardBehavior({
      wanderRadius: 10,
      homePosition: new THREE.Vector3(0, buildingY + 0.5, 2),
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

    const magicCircle = new MagicCircle(1.2, 0x9966ff);
    scene.add(magicCircle.getMesh());
    magicCircleRef.current = magicCircle;

    // Add click listener
    renderer.domElement.addEventListener('click', handleClick);

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
        return buildingBoundsRef.current!.floorY + 0.5; // Standing height on floor
      }
      return terrainBuilder.getHeightAt(x, z) + 0.5; // Standing height on terrain
    }

    // Helper function to select new destination
    function selectNewDestination(data: MinionSceneData): void {
      const halfSize = WORLD_HALF_SIZE * 0.8; // Stay within most of the cozy area

      // Pick a random point, avoiding building
      let targetX: number, targetZ: number;
      let attempts = 0;
      do {
        targetX = (Math.random() - 0.5) * halfSize * 2;
        targetZ = (Math.random() - 0.5) * halfSize * 2;
        attempts++;
      } while (isInsideBuilding(targetX, targetZ) && attempts < 10);

      const targetY = getGroundHeight(targetX, targetZ);
      data.targetPosition = new THREE.Vector3(targetX, targetY, targetZ);
      data.isMoving = true;
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

      // Update day/night cycle
      dayNightCycle.update(deltaTime);

      // Update torch manager based on time of day
      const timeOfDay = dayNightCycle.getTimeOfDay();
      torchManager.update(timeOfDay, deltaTime);

      // Update interior lights based on time of day
      // Night is roughly 0-0.22 and 0.78-1.0
      const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;
      const targetIntensity = isNight ? 1.0 : 0;

      for (const interiorLight of interiorLightsRef.current) {
        const currentIntensity = interiorLight.light.intensity;
        const diff = targetIntensity - currentIntensity;

        if (Math.abs(diff) > 0.01) {
          interiorLight.light.intensity += diff * deltaTime * 3;
        } else {
          interiorLight.light.intensity = targetIntensity;
        }

        // Toggle flame visibility based on lit state
        interiorLight.fixture.traverse((child) => {
          if (child instanceof THREE.Mesh &&
              child.material instanceof THREE.MeshBasicMaterial) {
            child.visible = interiorLight.light.intensity > 0.1;
          }
        });
      }

      // Animate magic orb - gentle floating rotation
      orb.rotation.y += 0.008;
      orb.position.y = buildingY + 6 + Math.sin(elapsedTime * 0.8) * 0.3;

      // Update wizard wandering behavior
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

      // Update teleport effects
      teleportEffect.update(deltaTime);
      magicCircle.update(deltaTime);

      // Track if any character is inside the building (wizard or minion)
      let anyCharacterInside = wizardIsInside;

      // Get current conversation state
      const conversationState = useGameStore.getState().conversation;
      const inConversation = conversationState.active;

      // Animate minions
      minionsRef.current.forEach((data) => {
        // Check if this minion is in conversation
        const isConversing = inConversation && conversationState.minionId === data.minionId;

        // Update animator (not moving if conversing)
        data.instance.animator.update(deltaTime, elapsedTime, data.isMoving && !isConversing);

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
          // Face the wizard during conversation
          const wizard = wizardRef.current;
          if (wizard) {
            const dirToWizard = new THREE.Vector3()
              .subVectors(wizard.mesh.position, data.currentPosition)
              .normalize();
            data.instance.mesh.rotation.y = Math.atan2(dirToWizard.x, dirToWizard.z);
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
          // Calculate direction to target
          const direction = data.targetPosition.clone().sub(data.currentPosition);
          const horizontalDir = new THREE.Vector3(direction.x, 0, direction.z);
          const horizontalDist = horizontalDir.length();

          // Face movement direction
          if (horizontalDist > 0.01) {
            data.instance.mesh.rotation.y = Math.atan2(horizontalDir.x, horizontalDir.z);
          }

          // Move toward target
          const moveDistance = data.speed * deltaTime;

          if (horizontalDist < moveDistance) {
            // Reached destination
            data.currentPosition.copy(data.targetPosition);
            data.isMoving = false;
            data.targetPosition = null;
            data.idleTimer = 1 + Math.random() * 3;
          } else {
            // Move horizontally
            horizontalDir.normalize().multiplyScalar(moveDistance);
            data.currentPosition.x += horizontalDir.x;
            data.currentPosition.z += horizontalDir.z;

            // Update Y to follow terrain
            data.currentPosition.y = getGroundHeight(
              data.currentPosition.x,
              data.currentPosition.z
            );
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
      });

      // Update wall culler with character-inside state
      if (wallCullerRef.current) {
        wallCullerRef.current.setCharacterInside(anyCharacterInside);
        wallCullerRef.current.update(deltaTime);
      }

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
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      roomMeshBuilder.dispose();
      terrainBuilderRef.current?.dispose();
      dayNightCycleRef.current?.dispose();
      torchManagerRef.current?.dispose();
      cameraControllerRef.current?.dispose();
      teleportEffectRef.current?.dispose();
      magicCircleRef.current?.dispose();
      wizardInstance.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handleClick]);

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
        return bounds.floorY + 0.5;
      }
      return terrain.getHeightAt(x, z) + 0.5;
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
        currentMinions.delete(minionId);
      }
    });

    // Update selected state (add glow to selected)
    currentMinions.forEach((data) => {
      const isSelected = data.minionId === selectedMinionId;
      data.instance.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissiveIntensity = isSelected ? 0.3 : 0;
          if (isSelected && child.material.emissive) {
            child.material.emissive.setHex(0xffff00);
          }
        }
      });
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

    // When entering conversation completes, set phase to active
    if (conversation.phase === 'entering' && !cameraControllerRef.current.isTransitioning()) {
      // Camera might still be transitioning, wait a bit
      const timer = setTimeout(() => {
        if (!cameraControllerRef.current?.isTransitioning()) {
          setConversationPhase('active');
        }
      }, 900); // Slightly after transition duration

      return () => clearTimeout(timer);
    }
  }, [conversation.phase, setConversationPhase]);

  // Expose exit conversation for UI components
  const handleLeaveConversation = useCallback(() => {
    exitConversation();
  }, [exitConversation]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'pointer' }} />;
}
