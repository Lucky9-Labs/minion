'use client';

import type { BuildingType, BuildingStage } from '@/types/project';
import {
  CottageBuilding,
  WorkshopBuilding,
  LaboratoryBuilding,
  MarketBuilding,
  ManorBuilding,
} from './buildings';
import { Tower } from './Tower';

interface BuildingProps {
  type: BuildingType;
  stage: BuildingStage;
  level: number;
  position: [number, number, number];
  onClick?: () => void;
  isSelected?: boolean;
  name?: string;
}

export function Building({
  type,
  stage,
  level,
  position,
  onClick,
  isSelected,
}: BuildingProps) {
  const buildingProps = {
    stage,
    level,
    position,
    onClick,
    isSelected,
  };

  switch (type) {
    case 'cottage':
      return <CottageBuilding {...buildingProps} />;
    case 'workshop':
      return <WorkshopBuilding {...buildingProps} />;
    case 'laboratory':
      return <LaboratoryBuilding {...buildingProps} />;
    case 'market':
      return <MarketBuilding {...buildingProps} />;
    case 'manor':
      return <ManorBuilding {...buildingProps} />;
    case 'tower':
      // Use existing Tower component for wizard tower
      // Generate floors based on building level
      const towerFloors = ['library', 'workshop', 'forge', 'observatory', 'portal'].slice(
        0,
        Math.min(level, 5)
      ) as ('library' | 'workshop' | 'forge' | 'observatory' | 'portal')[];
      return (
        <group position={position} onClick={onClick}>
          <Tower unlockedFloors={towerFloors} />
          {isSelected && (
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[3, 3.3, 32]} />
              <meshBasicMaterial color="#4ade80" transparent opacity={0.5} />
            </mesh>
          )}
        </group>
      );
    default:
      return <CottageBuilding {...buildingProps} />;
  }
}
