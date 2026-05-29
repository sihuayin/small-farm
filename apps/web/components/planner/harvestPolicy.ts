import { getPlantAgronomy, plantMap } from './plants';

export function shouldRemoveAfterHarvest(plantId: string) {
  const agronomy = getPlantAgronomy(plantId);
  const plant = plantMap.get(plantId);
  if (plant?.category === 'herb' || agronomy.rotationGroup === 'perennial') return false;
  return agronomy.rotationGroup === 'root' || agronomy.rotationGroup === 'leafy';
}
