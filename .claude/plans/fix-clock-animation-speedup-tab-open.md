# Fix: Clock/Animation Speedup When Tab Is Open

## Problem Summary

Animations and entity movement progressively speed up the longer a tab remains open. This includes minion movement, wildlife hopping, water effects, and other animated elements.

## Root Cause Analysis

### Primary Issue: Missing `cancelAnimationFrame` in SimpleScene.tsx

**Location**: `src/components/SimpleScene.tsx:982-1371`

The main animation loop starts with `requestAnimationFrame(animate)` at the beginning of each frame (line 983), and `animate(0)` kicks off the loop (line 1371). However, the cleanup function (lines 1383-1419) **never calls `cancelAnimationFrame()`**.

**What happens:**
1. Component mounts, animation loop starts
2. If React re-renders the component (state change, parent update, etc.), the useEffect runs again
3. Old animation loop continues running (no cancellation)
4. New animation loop starts
5. Both loops now call all update functions, doubling animation speed
6. This compounds with each re-render

**Evidence**: `Portrait3D.tsx` implements this correctly:
- Line 32: `const frameIdRef = useRef<number>(0);`
- Line 116: `frameIdRef.current = requestAnimationFrame(animate);`
- Line 129: `cancelAnimationFrame(frameIdRef.current);`

### Secondary Issue: Quest Simulation Effect Dependencies

**Location**: `src/components/ui/QuestPanel.tsx:46-121`

The `useQuestSimulation` hook has `quest?.progress` in its dependency array (line 121). Since progress updates every 500ms, the effect constantly re-runs. While cleanup does happen (clearInterval/clearTimeout), this rapid effect cycling could contribute to timing issues.

### Affected Systems (All Updated in Main Animation Loop)

All these systems receive `deltaTime` from the animation loop and will speed up if the loop runs multiple times per frame:

| System | File | Update Method |
|--------|------|---------------|
| Day/Night Cycle | `DayNightCycle.ts:170` | `this.timeOfDay += deltaTime / cycleDuration` |
| Waterfall | `Waterfall.ts:323` | `this.time += deltaTime` |
| Rat System | `RatSystem.ts:243,273,282` | `rat.bodyBob += deltaTime * N` |
| Wildlife | `SimpleScene.tsx:1059` | `animal.hopPhase += deltaTime * N` |
| Cloud Shadows | `SimpleScene.tsx:1041-1042` | `cloud.offset += speed * deltaTime` |
| Torch Manager | `TorchManager.ts` | Various flicker updates |
| Sky Environment | `SkyEnvironment.ts` | Cloud/star animations |
| River Material | `ContinuousTerrainBuilder.ts` | Water flow animation |
| Magic Orb | `SimpleScene.tsx:1036-1037` | Rotation and float |
| Selection Crystal | `SimpleScene.tsx:1337-1338` | Rotation and bob |

## Implementation

### Fix Applied: Animation Frame Cleanup in SimpleScene.tsx

Added proper animation frame ID tracking and cancellation:

1. Added ref to track animation frame ID:
   ```typescript
   const animationFrameIdRef = useRef<number>(0);
   ```

2. Store frame ID when requesting animation frame:
   ```typescript
   function animate(time: number) {
     animationFrameIdRef.current = requestAnimationFrame(animate);
     // ...
   }
   ```

3. Cancel animation frame in cleanup:
   ```typescript
   return () => {
     cancelAnimationFrame(animationFrameIdRef.current);
     // ... existing cleanup
   };
   ```

### Not Changed: Quest Simulation Dependencies

After analysis, the `quest?.progress` dependency in QuestPanel.tsx is actually **required** for the progress accumulation logic to work correctly. The interval uses closure values, so without re-running the effect when progress changes, the progress would not accumulate properly. This is a separate timer system that doesn't affect the main Three.js animation loop.

## Files Modified

1. **`src/components/SimpleScene.tsx`** (3 changes)
   - Line 117: Added `animationFrameIdRef` ref
   - Line 984: Store return value of `requestAnimationFrame`
   - Line 1385: Added `cancelAnimationFrame()` to cleanup

## Testing Strategy

1. Open the application and observe initial animation speeds
2. Leave the tab open for 5+ minutes
3. Verify animations maintain consistent speed
4. Switch tabs away and back, verify no speed changes
5. Start a quest and verify progress simulation works correctly
6. Verify day/night cycle completes in expected time (~3 minutes)

## Risk Assessment

- **Low risk**: The fix follows established patterns already used in `Portrait3D.tsx`
- **No behavioral changes**: Animation speeds will be correct, not different
- **Quest simulation**: Removing `progress` from deps should not affect functionality since the interval handles updates internally
