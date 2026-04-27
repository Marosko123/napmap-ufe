import { Component, Event, EventEmitter, Host, Prop, Watch, h } from '@stencil/core';
import L from 'leaflet';
import { Station } from '../../api/napmap';

const LEAFLET_CSS_HREF = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CSS_INTEGRITY = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';

const DEFAULT_CENTER: [number, number] = [48.6690, 19.6990];
const DEFAULT_ZOOM = 7;

@Component({
  tag: 'mb-napmap-map',
  styleUrl: 'mb-napmap-map.css',
  shadow: false,
})
export class MbNapmapMap {
  @Event({ eventName: 'station-clicked' }) stationClicked: EventEmitter<string>;
  @Prop() stations: Station[] = [];

  private mapEl?: HTMLDivElement;
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  componentWillLoad() {
    if (typeof document === 'undefined') return;
    if (document.querySelector(`link[href="${LEAFLET_CSS_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_HREF;
    link.integrity = LEAFLET_CSS_INTEGRITY;
    link.crossOrigin = '';
    document.head.appendChild(link);
  }

  componentDidLoad() {
    if (!this.mapEl) return;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    this.map = L.map(this.mapEl).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers();
  }

  disconnectedCallback() {
    this.map?.remove();
    this.map = undefined;
    this.markersLayer = undefined;
  }

  @Watch('stations')
  onStationsChange() {
    this.renderMarkers();
  }

  private renderMarkers() {
    if (!this.map || !this.markersLayer) return;
    this.markersLayer.clearLayers();

    const validStations = (this.stations || []).filter(
      s => Number.isFinite(s.lat) && Number.isFinite(s.lng)
    );

    const bounds: L.LatLngTuple[] = [];
    for (const station of validStations) {
      const marker = L.marker([station.lat, station.lng]);
      const fuels = (station.fuels || []).join(', ');
      const power = station.maxPowerKw ? ` &middot; ${station.maxPowerKw} kW` : '';
      marker.bindPopup(
        `<strong>${this.escape(station.name)}</strong><br>` +
        `${this.escape(station.address)}, ${this.escape(station.city)}<br>` +
        `<small>${this.escape(fuels)}${power}</small>`
      );
      marker.on('click', () => this.stationClicked.emit(station.id));
      marker.addTo(this.markersLayer!);
      bounds.push([station.lat, station.lng]);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      this.map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }

  private escape(value: string | undefined): string {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    return (
      <Host>
        <div class="map" ref={(el) => (this.mapEl = el as HTMLDivElement)}></div>
      </Host>
    );
  }
}
