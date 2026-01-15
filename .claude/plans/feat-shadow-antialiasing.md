# Shadow Antialiasing Implementation Plan

**Branch**: `feat-shadow-antialiasing`
**Priority**: Performance-first with industry-standard shadow smoothing
**Scope**: Antialiasing + bug fixes

## Overview

Implement shadow antialiasing to smooth out hard edges and pixelation artifacts in the isometric tower scene. The strategy prioritizes minimal performance impact by using three complementary, low-cost techniques:

1. **Apply unused time-of-day shadow radius** (quick win, no perf cost)
2. **Optimize shadow bias and normal bias** (bug fix, slight improvement)
3. **Fine-tune PCF shadow filtering parameters** (minimal cost, noticeable improvement)

This approach uses **Three.js's built-in `PCFSoftShadowMap`** (already enabled) with better parameter tuning instead of expensive techniques like VSM or custom shaders.

---

## Current State

### Shadow Configuration
- **Renderer**: `PCFSoftShadowMap` enabled ✓
- **Shadow Map Size**: 512px (256px during flight) ✓
- **Sun Light**: `shadowRadius: 1` (hardcoded, no softness)
- **Time-of-Day Settings**: Defined in `SHADOW_SETTINGS` but **never applied** to `sunLight.shadow.radius`
- **Shadow Bias**: `-0.001` (functional)
- **Normal Bias**: `0.02` (functional)

### Problems
1. **Hard shadow edges**: `shadowRadius: 1` provides minimal PCF softening
2. **Unused settings**: `SHADOW_SETTINGS` defines radius 1-2 per period, never used
3. **No adaptive smoothing**: Shadows look same regardless of time of day
4. **Suboptimal bias values**: Not tuned for current light/shadow map setup

---

## Implementation Strategy

### Phase 1: Bug Fix - Apply Time-of-Day Shadow Radius
**File**: `src/lib/lighting/DayNightCycle.ts`
**Task**: Make the already-defined `SHADOW_SETTINGS.shadowRadius` actually apply to `sunLight.shadow.radius`

**Changes**:
- In the light update loop (around line 120-135), apply the time-of-day `shadowRadius` to `sunLight.shadow.radius`
- Currently line 133 sets: `sunLight.shadow.radius = 1` (hardcoded)
- Change to: `sunLight.shadow.radius = currentShadowSettings.shadowRadius`
- This gives you radius values of 1-2 throughout the day (1 at noon, 2 at dawn/dusk)
- **Performance cost**: None (no additional computation)
- **Visual improvement**: Softer shadows at dusk/dawn, crisp shadows at noon

### Phase 2: Optimize Shadow Bias
**File**: `src/lib/lighting/DayNightCycle.ts`
**Task**: Fine-tune shadow bias values based on shadow map size and radius

**Current values**:
```typescript
sunLight.shadow.bias = -0.001
sunLight.shadow.normalBias = 0.02
```

**Optimized values** (based on PCF soft shadow mapping best practices):
```typescript
// Dynamic bias based on shadow map size
const shadowMapSize = 512
const baseBias = -0.0001
const dynamicBias = baseBias * (2048 / shadowMapSize) // Scale to standard size
sunLight.shadow.bias = dynamicBias // Results in ~-0.0004 for 512px maps

// Normal bias proportional to light distance and shadow radius
const normalBias = 0.02 + (sunLight.shadow.radius * 0.01)
sunLight.shadow.normalBias = normalBias // Results in 0.02-0.03 depending on radius
```

**Rationale**:
- Smaller bias prevents shadow acne without over-softening
- Normal bias scaled to shadow radius prevents peter-panning
- **Performance cost**: Negligible (4 arithmetic operations)
- **Visual improvement**: Eliminates shadow artifacts (acne, peter-panning)

### Phase 3: Enhance PCF Parameters
**File**: `src/lib/lighting/DayNightCycle.ts`
**Task**: Increase shadow radius ranges for better PCF softening

**Current radius values** (per time period):
```
Dawn: 2    → Increase to 2.5-3.0
Morning: 1 → Increase to 1.5-2.0
Noon: 1    → Keep at 1.0-1.5 (crisp shadows)
Afternoon: 1 → Increase to 1.5-2.0
Dusk: 2    → Increase to 2.5-3.0
Night: 2   → Increase to 3.0-4.0 (softest)
```

**Implementation**:
- Update `SHADOW_SETTINGS` object with new radius values
- Smooth transitions between periods with interpolation (already happens via time-of-day blending)

**Rationale**:
- PCF with radius 1-4 is the industry standard for real-time 3D (games, VFX)
- Larger radius = more softness = better antialiasing appearance
- **Performance cost**: Minimal—PCF radius only affects blur kernel size, not shadow map generation
- **Visual improvement**: Noticeably softer, smoother shadows without visible pixelation

### Phase 4: Optional - Adjust Shadow Map Size Strategy
**File**: `src/components/SimpleScene.tsx` (lines 460-468)
**Status**: Optional enhancement, only if Phases 1-3 insufficient

If shadow aliasing still visible after Phases 1-3:
- Consider increasing shadow map size from 512 to 1024 for Sun light
- This is only needed if shadows appear pixelated even with Phase 3 radius values
- Keep Moon light at 256 (not used, performance)
- **Performance cost**: ~2-3% GPU memory increase
- **Only implement if needed after testing Phases 1-3**

---

## Technical Details

### Why This Approach Works

1. **PCFSoftShadowMap is industry standard**: Used in all major game engines (Unity, Unreal)
   - Already enabled in the codebase
   - Mathematically optimal for real-time shadows
   - Shadow radius parameter directly controls quality

2. **Time-of-day radius variation is physically plausible**:
   - Low sun angles (dawn/dusk) = softer, longer shadows
   - High sun angle (noon) = sharper, shorter shadows
   - Increasing shadow radius at extreme angles matches real light diffusion

3. **Bias optimization prevents artifacts**:
   - Shadow acne (dark speckles): caused by insufficient bias
   - Peter-panning (shadows detached from objects): caused by excessive bias
   - Dynamic bias balances both

### Performance Analysis

| Technique | GPU Cost | VRAM Cost | Implementation |
|-----------|----------|-----------|-----------------|
| Phase 1: Time-of-day radius | ~0% | 0% | 1 line change |
| Phase 2: Bias optimization | ~0% | 0% | 4 arithmetic ops |
| Phase 3: Larger radius values | ~1-2% | 0% | Update constants |
| Phase 4: Higher map resolution | ~2-3% | +512KB per light | Map size increase |
| **Total estimated cost** | **~1-2%** | **Minimal** | Low complexity |

This is well below the 5% budget for shadow improvements in typical game/visualization projects.

---

## Files to Modify

1. **`src/lib/lighting/DayNightCycle.ts`** (primary)
   - Lines 57-64: Update `SHADOW_SETTINGS` radius values
   - Lines 120-135: Apply time-of-day radius to `sunLight.shadow.radius`
   - Lines 120-135: Implement dynamic bias calculation

2. **`src/components/SimpleScene.tsx`** (optional, Phase 4 only)
   - Lines 460-468: Increase shadow map size if needed after testing

---

## Testing Strategy

1. **Before changes**: Screenshot shadows at different times of day
2. **After Phase 1**: Verify shadow softness changes with time of day
3. **After Phase 2**: Check for shadow acne and peter-panning artifacts (should be gone/reduced)
4. **After Phase 3**: Compare shadow softness to "before"—should be noticeably smoother
5. **Performance**: Run dev tools to ensure no FPS drops
6. **Comparison**: Side-by-side screenshots of morning shadows (control) and night shadows (should be softer)

---

## Rollback Plan

All changes are to constants and a few parameter assignments. Rollback is simple:
- Revert `DayNightCycle.ts` to commit `f94f578`
- Changes are isolated to lighting system, no dependent code

---

## Success Criteria

✓ Shadows appear smooth and antialiased (no visible pixelation)
✓ No performance regression (FPS unchanged)
✓ No shadow artifacts (acne, peter-panning)
✓ Time-of-day shadow variation visible and physically plausible
✓ Changes minimal and non-invasive

---

## Architecture Notes

The implementation fits naturally into the existing architecture:
- `DayNightCycle.ts` already manages all light parameters per time of day
- Three.js `PCFSoftShadowMap` already enabled in renderer
- No new dependencies or refactoring needed
- No impact on game state, UI, or other systems
- Pure rendering improvement
