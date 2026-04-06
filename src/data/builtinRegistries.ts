import type { Registries } from '../types/schema';

export const BUILTIN_REGISTRIES: Registries = {
  terrain: [
    { id: 'grass', name: 'Grass', category: 'natural', color: '#4CAF50', textureUrl: null, costPerUnit: null, description: null },
    { id: 'soil', name: 'Soil', category: 'natural', color: '#8B4513', textureUrl: null, costPerUnit: null, description: null },
    { id: 'gravel', name: 'Gravel', category: 'hardscape', color: '#9E9E9E', textureUrl: null, costPerUnit: null, description: null },
    { id: 'concrete', name: 'Concrete', category: 'hardscape', color: '#BDBDBD', textureUrl: null, costPerUnit: null, description: null },
    { id: 'mulch', name: 'Mulch', category: 'natural', color: '#6D4C41', textureUrl: null, costPerUnit: null, description: null },
    { id: 'water', name: 'Water', category: 'water', color: '#2196F3', textureUrl: null, costPerUnit: null, description: null },
  ],
  plants: [],
  structures: [],
  paths: [],
};
