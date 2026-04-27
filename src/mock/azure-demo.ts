import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { Station } from '../api/napmap';

const sampleStations: Station[] = [
  {
    id: 'st-001',
    name: 'Tesla Supercharger Bratislava Polus',
    stationType: 'CHARGING',
    fuels: ['ELECTRIC'],
    operatorName: 'Tesla',
    address: 'Vajnorská 100',
    city: 'Bratislava',
    country: 'SK',
    lat: 48.1817,
    lng: 17.1303,
    openingHours: '24/7',
    maxPowerKw: 250,
    connectors: ['Tesla', 'CCS2'],
    services: ['parking', 'wifi'],
    status: 'ACTIVE',
  },
  {
    id: 'st-002',
    name: 'Greenway Žilina',
    stationType: 'CHARGING',
    fuels: ['ELECTRIC'],
    operatorName: 'Greenway',
    address: 'Bratislavská 5',
    city: 'Žilina',
    country: 'SK',
    lat: 49.2231,
    lng: 18.7393,
    openingHours: '24/7',
    maxPowerKw: 50,
    connectors: ['CCS2', 'Type2'],
    services: [],
    status: 'ACTIVE',
  },
  {
    id: 'st-003',
    name: 'OMV Vodíková stanica Košice',
    stationType: 'REFUELING',
    fuels: ['HYDROGEN'],
    operatorName: 'OMV',
    address: 'Hlavná 100',
    city: 'Košice',
    country: 'SK',
    lat: 48.7164,
    lng: 21.2611,
    openingHours: '06:00-22:00',
    maxPowerKw: 0,
    connectors: ['H2-700bar'],
    services: [],
    status: 'ACTIVE',
  },
  {
    id: 'st-004',
    name: 'ZSE Drive Petržalka',
    stationType: 'CHARGING',
    fuels: ['ELECTRIC'],
    operatorName: 'ZSE Drive',
    address: 'Einsteinova 25',
    city: 'Bratislava',
    country: 'SK',
    lat: 48.1232,
    lng: 17.1175,
    openingHours: '24/7',
    maxPowerKw: 100,
    connectors: ['CCS2', 'CHAdeMO'],
    services: ['cafe'],
    status: 'ACTIVE',
  },
  {
    id: 'st-005',
    name: 'Slovnaft CNG Trnava',
    stationType: 'REFUELING',
    fuels: ['CNG', 'LPG'],
    operatorName: 'Slovnaft',
    address: 'Bratislavská 80',
    city: 'Trnava',
    country: 'SK',
    lat: 48.3774,
    lng: 17.5856,
    openingHours: '06:00-22:00',
    maxPowerKw: 0,
    connectors: [],
    services: [],
    status: 'ACTIVE',
  },
  {
    id: 'st-006',
    name: 'EVN Banská Bystrica',
    stationType: 'CHARGING',
    fuels: ['ELECTRIC'],
    operatorName: 'EVN',
    address: 'Námestie SNP 14',
    city: 'Banská Bystrica',
    country: 'SK',
    lat: 48.7368,
    lng: 19.1463,
    openingHours: '24/7',
    maxPowerKw: 22,
    connectors: ['Type2'],
    services: [],
    status: 'ACTIVE',
  },
];

let store: Station[] = [...sampleStations];
let installed = false;

export function isAzureStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('azurewebsites.net');
}

export function installAzureDemoMock(): void {
  if (installed) return;
  installed = true;

  const mock = new MockAdapter(axios, { onNoMatch: 'passthrough' });

  mock.onGet(/\/api\/stations\/[^/?]+(\?.*)?$/).reply((cfg) => {
    const url = new URL(cfg.url!, 'http://x');
    const id = url.pathname.split('/').pop()!;
    const found = store.find((s) => s.id === id);
    return found ? [200, found] : [404, { error: 'station not found' }];
  });

  mock.onGet(/\/api\/stations(\?.*)?$/).reply((cfg) => {
    const url = new URL(cfg.url!, 'http://x');
    const city = url.searchParams.get('city')?.toLowerCase();
    const fuel = url.searchParams.get('fuel');
    const stationType = url.searchParams.get('stationType');
    let result = store;
    if (city) result = result.filter((s) => s.city.toLowerCase().includes(city));
    if (fuel) result = result.filter((s) => s.fuels.includes(fuel as Station['fuels'][number]));
    if (stationType) result = result.filter((s) => s.stationType === stationType);
    return [200, result];
  });

  mock.onPost(/\/api\/stations$/).reply((cfg) => {
    const body = JSON.parse(cfg.data) as Station;
    const newId = 'st-' + Math.random().toString(36).slice(2, 8);
    const created: Station = { ...body, id: newId };
    store = [...store, created];
    return [201, created];
  });

  mock.onPut(/\/api\/stations\/[^/?]+$/).reply((cfg) => {
    const id = cfg.url!.split('/').pop()!;
    const idx = store.findIndex((s) => s.id === id);
    if (idx < 0) return [404, { error: 'station not found' }];
    const body = JSON.parse(cfg.data) as Station;
    const updated: Station = { ...body, id };
    store = [...store.slice(0, idx), updated, ...store.slice(idx + 1)];
    return [200, updated];
  });

  mock.onDelete(/\/api\/stations\/[^/?]+$/).reply((cfg) => {
    const id = cfg.url!.split('/').pop()!;
    const idx = store.findIndex((s) => s.id === id);
    if (idx < 0) return [404, { error: 'station not found' }];
    store = [...store.slice(0, idx), ...store.slice(idx + 1)];
    return [204];
  });
}
