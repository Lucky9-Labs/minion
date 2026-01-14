# Client-Side Performance Optimizations Plan

**STATUS: IMPLEMENTED**

## Overview

This plan addresses performance bottlenecks identified in the Mage Tower codebase, targeting **60 FPS** in first-person mode with **10-20 active minions**. Visual quality tradeoffs are acceptable, and we'll implement both **LOD and distance culling**.

---

## 1. Object Pooling & Geometry Sharing

### Problem
- `MinionEntity.tsx` creates new geometries/materials per instance (lines 309-562)
- `SimpleScene.tsx` creates animal meshes inline without reuse (lines 609-707)
- Cloud shadows create new geometries each time (lines 574-603)

### Solution: Shared Geometry/Material Registry

**Files to modify:**
- Create `src/lib/geometryPool.ts`
- Modify `src/components/MinionEntity.tsx`
- Modify `src/components/SimpleScene.tsx`

**Implementation:**
```typescript
// geometryPool.ts - Singleton pool for shared geometries
export const GeometryPool = {
  sphere: new THREE.SphereGeometry(1, 6, 5),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  // ... other primitives
};

export const MaterialPool = {
  goblinSkin: new THREE.MeshStandardMaterial({ color: '#5a9c4e' }),
  // ... other materials
};
```

- Replace inline geometry creation with scaled pool references
- Use `geometry.clone()` only when modifications needed
- Estimated memory reduction: **~60%** for minion meshes

---

## 2. Vector3 Object Pooling

### Problem
- `SimpleScene.tsx` creates temporary Vector3 objects every frame (lines 1202, 1326, 1547)
- `clone()` and `new Vector3()` in animation loops cause GC pressure

### Solution: Reusable Vector Pool

**Files to modify:**
- Create `src/lib/vectorPool.ts`
- Modify `src/components/SimpleScene.tsx`

**Implementation:**
```typescript
// vectorPool.ts
const pool: THREE.Vector3[] = [];
let index = 0;

export function getVec3(): THREE.Vector3 {
  if (index >= pool.length) pool.push(new THREE.Vector3());
  return pool[index++];
}

export function resetPool() { index = 0; } // Call at frame start
```

- Replace `position.clone().sub(target)` with `getVec3().copy(position).sub(target)`
- Call `resetPool()` at start of animation frame
- Estimated GC reduction: **~80%** in animation loop

---

## 3. Zustand Store Optimization

### Problem
- `updateMinionPosition` (gameStore.ts:175-181) creates new array on every call
- Called 50+ times/second during quest simulation
- Multiple selectors in `GameLayout.tsx` (lines 26-31) cause re-renders

### Solution: Immer + Selective Subscriptions

**Files to modify:**
- Modify `src/store/gameStore.ts`
- Modify `src/components/GameLayout.tsx`
- Modify `src/components/SimpleScene.tsx`

**Implementation:**

A) **Use Zustand's shallow equality for selectors:**
```typescript
import { shallow } from 'zustand/shallow';

// Instead of multiple useGameStore calls:
const { minions, selectedMinionId, cameraMode } = useGameStore(
  (state) => ({
    minions: state.minions,
    selectedMinionId: state.selectedMinionId,
    cameraMode: state.cameraMode,
  }),
  shallow
);
```

B) **Separate high-frequency updates from React state:**
```typescript
// Create non-reactive position store for animations
export const minionPositions = new Map<string, { x: number; y: number; z: number }>();

// Only sync to Zustand on significant changes or intervals
```

C) **Batch position updates:**
```typescript
updateMinionPositions: (updates: Map<string, Position>) => {
  set((state) => ({
    minions: state.minions.map((m) => {
      const pos = updates.get(m.id);
      return pos ? { ...m, position: pos } : m;
    }),
  }));
},
```

---

## 4. useFrame Consolidation

### Problem
- `MinionEntity.tsx` has `useFrame` per minion instance (line 217)
- With 20 minions = 20 separate useFrame callbacks
- `Tower.tsx` has per-floor useFrame (line 33)

### Solution: Single Animation Manager

**Files to modify:**
- Create `src/lib/animationManager.ts`
- Modify `src/components/MinionEntity.tsx`
- Modify `src/components/SimpleScene.tsx`

**Implementation:**
```typescript
// animationManager.ts
type AnimationCallback = (time: number, delta: number) => void;
const callbacks = new Map<string, AnimationCallback>();

export function registerAnimation(id: string, callback: AnimationCallback) {
  callbacks.set(id, callback);
}

export function unregisterAnimation(id: string) {
  callbacks.delete(id);
}

// Single useFrame in Scene that calls all registered callbacks
export function useAnimationManager() {
  useFrame((state, delta) => {
    callbacks.forEach((cb) => cb(state.clock.elapsedTime, delta));
  });
}
```

- Minions register their animation logic on mount, unregister on unmount
- Single useFrame iterates through all animations
- Estimated overhead reduction: **~40%** for frame callbacks

---

## 5. Level of Detail (LOD) System

### Problem
- All minions render at full detail regardless of distance
- First-person camera makes distant objects tiny but still fully rendered

### Solution: Distance-Based LOD + Culling

**Files to modify:**
- Create `src/lib/lodSystem.ts`
- Modify `src/components/MinionEntity.tsx`
- Modify `src/components/SimpleScene.tsx`

**Implementation:**

A) **LOD Tiers for Minions:**
```typescript
const LOD_DISTANCES = {
  HIGH: 10,    // Full detail: all meshes, animations
  MEDIUM: 25,  // Simplified: fewer segments, basic animation
  LOW: 50,     // Billboard sprite or colored capsule
  CULL: 80,    // Don't render
};
```

B) **Simplified Minion for Medium LOD:**
- Reduce sphere segments from 6 to 4
- Disable ear/eye animations
- Use single mesh instead of 15+ parts

C) **Billboard for Low LOD:**
- Replace 3D minion with 2D sprite facing camera
- Pre-render minion sprites for each role

D) **Frustum Culling:**
```typescript
// Check if object is in camera frustum before rendering
const frustum = new THREE.Frustum();
frustum.setFromProjectionMatrix(camera.projectionMatrix);

if (!frustum.containsPoint(minionPosition)) {
  return null; // Don't render
}
```

---

## 6. Animation Loop Optimization

### Problem
- `SimpleScene.tsx` animate loop (lines 1115-1649) does heavy work every frame:
  - Interior light traversal (line 1155)
  - Wildlife pathfinding (lines 1186-1273)
  - `isWalkable()` terrain checks without caching

### Solution: Throttled Updates + Dirty Flags

**Files to modify:**
- Modify `src/components/SimpleScene.tsx`
- Create `src/lib/throttle.ts`

**Implementation:**

A) **Throttle non-critical updates:**
```typescript
// Wildlife AI: update every 100ms instead of every frame
const WILDLIFE_UPDATE_INTERVAL = 100;
let lastWildlifeUpdate = 0;

if (time - lastWildlifeUpdate > WILDLIFE_UPDATE_INTERVAL) {
  updateWildlifeAI();
  lastWildlifeUpdate = time;
}
```

B) **Cache terrain walkability:**
```typescript
// Pre-compute walkable grid on load
const walkableCache = new Map<string, boolean>();
function isWalkableCached(x: number, z: number): boolean {
  const key = `${Math.floor(x)},${Math.floor(z)}`;
  if (!walkableCache.has(key)) {
    walkableCache.set(key, terrainBuilder.isWalkable(x, z));
  }
  return walkableCache.get(key)!;
}
```

C) **Dirty flag for light fixtures:**
```typescript
// Only traverse fixtures when intensity actually changes
if (intensityChanged && !fixture.userData.traversed) {
  fixture.traverse((child) => { ... });
  fixture.userData.traversed = true;
}
```

---

## 7. Event Listener Cleanup

### Problem
- `SimpleScene.tsx` (lines 1062-1068) adds multiple listeners in useEffect
- `GameLayout.tsx` (lines 77-80) recreates handler on dependency change
- Listeners re-attach when dependencies change

### Solution: Stable References + Cleanup

**Files to modify:**
- Modify `src/components/SimpleScene.tsx`
- Modify `src/components/GameLayout.tsx`

**Implementation:**
```typescript
// Use ref for callback to avoid dependency changes
const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>();

useEffect(() => {
  handleKeyDownRef.current = (event) => {
    // Access latest state via refs or getState()
    const { conversation } = useGameStore.getState();
    if (event.key === 'Escape' && conversation.active) {
      useGameStore.getState().exitConversation();
    }
  };
}, []); // Empty deps - never re-creates

useEffect(() => {
  const handler = (e: KeyboardEvent) => handleKeyDownRef.current?.(e);
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []); // Listener added once
```

---

## 8. Conditional Rendering Optimization

### Problem
- `MinionEntity.tsx` (lines 239-242) calls `setExpression()` inside useFrame
- Causes React re-render every time expression changes
- Conditional mesh rendering (lines 531-542) adds/removes from scene graph

### Solution: Ref-Based Animation State

**Files to modify:**
- Modify `src/components/MinionEntity.tsx`

**Implementation:**
```typescript
// Use refs instead of state for animation-driven values
const expressionRef = useRef<Expression>('neutral');

useFrame(() => {
  const target = getExpressionForState(minion.state);
  expressionRef.current = target;

  // Directly manipulate mesh visibility instead of conditional render
  if (mischievousMeshRef.current) {
    mischievousMeshRef.current.visible = target === 'mischievous';
  }
});

// Render all expression meshes, control via visible property
<mesh ref={mischievousMeshRef} visible={false}>...</mesh>
```

---

## 9. First-Person Specific Optimizations

### Problem
- First-person mode renders everything at same detail as isometric
- Camera is close to ground, most detail is wasted on distant objects

### Solution: View-Mode Aware Rendering

**Files to modify:**
- Modify `src/components/SimpleScene.tsx`
- Modify `src/components/MinionEntity.tsx`

**Implementation:**

A) **Reduce shadow quality in first-person:**
```typescript
if (cameraMode === 'firstPerson') {
  renderer.shadowMap.type = THREE.BasicShadowMap; // vs PCFSoftShadowMap
  directionalLight.shadow.mapSize.set(1024, 1024); // vs 2048
}
```

B) **Disable distant wildlife in first-person:**
```typescript
const FIRST_PERSON_WILDLIFE_RANGE = 30;
animals.forEach((animal) => {
  animal.visible = cameraMode !== 'firstPerson' ||
    animal.position.distanceTo(cameraPosition) < FIRST_PERSON_WILDLIFE_RANGE;
});
```

C) **Reduce cloud shadow count:**
```typescript
const cloudCount = cameraMode === 'firstPerson' ? 2 : 5;
```

---

## 10. Memory Cleanup on Mode Switch

### Problem
- Switching between isometric and first-person doesn't clean up unused resources
- Geometries and materials accumulate

### Solution: Mode Transition Cleanup

**Files to modify:**
- Modify `src/components/SimpleScene.tsx`
- Modify `src/store/gameStore.ts`

**Implementation:**
```typescript
useEffect(() => {
  if (previousMode === 'isometric' && cameraMode === 'firstPerson') {
    // Unload isometric-only resources
    disposeIsometricResources();
  } else if (previousMode === 'firstPerson' && cameraMode === 'isometric') {
    // Unload first-person optimizations
    disposeFirstPersonResources();
  }
}, [cameraMode]);

function disposeIsometricResources() {
  // Dispose high-detail LOD meshes not needed in first-person
  // Clear cached sprites
}
```

---

## Implementation Order

1. **Vector3 Pooling** (High impact, low risk)
2. **Zustand Store Optimization** (High impact, medium risk)
3. **useFrame Consolidation** (High impact, medium risk)
4. **Animation Loop Throttling** (Medium impact, low risk)
5. **Geometry/Material Pooling** (Medium impact, low risk)
6. **LOD System** (High impact, higher complexity)
7. **Event Listener Cleanup** (Low impact, low risk)
8. **Conditional Rendering Fix** (Medium impact, low risk)
9. **First-Person Specific Opts** (Medium impact, medium risk)
10. **Memory Cleanup** (Low impact, low risk)

---

## Expected Results

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Frame Time | ~25ms | <16ms |
| GC Pauses | Frequent | Rare |
| Memory Growth | Linear | Stable |
| FPS (20 minions) | ~35 | 60+ |

---

## Files to Create

- `src/lib/geometryPool.ts` - Shared geometry/material registry
- `src/lib/vectorPool.ts` - Reusable Vector3 pool
- `src/lib/animationManager.ts` - Centralized animation loop
- `src/lib/lodSystem.ts` - Distance-based LOD controller
- `src/lib/throttle.ts` - Utility for throttled updates

## Files to Modify

- `src/store/gameStore.ts` - Shallow selectors, batched updates
- `src/components/SimpleScene.tsx` - Animation loop, event listeners, LOD
- `src/components/MinionEntity.tsx` - Shared geometry, ref-based animation
- `src/components/GameLayout.tsx` - Selector consolidation
- `src/components/Tower.tsx` - Remove per-floor useFrame
