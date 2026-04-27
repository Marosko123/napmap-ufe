import { Component, Element, Event, EventEmitter, Host, Prop, Watch, h } from '@stencil/core';
import L from 'leaflet';
import { Station } from '../../api/napmap';

const LEAFLET_CSS_HREF = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [48.6690, 19.6990];
const DEFAULT_ZOOM = 7;

@Component({
  tag: 'mb-napmap-map',
  styleUrl: 'mb-napmap-map.css',
  shadow: false,
})
export class MbNapmapMap {
  @Element() hostElement!: HTMLElement;
  @Event({ eventName: 'station-clicked' }) stationClicked: EventEmitter<string>;
  @Prop() stations: Station[] = [];

  private mapEl?: HTMLDivElement;
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private resizeObserver?: ResizeObserver;
  private windowResize = () => this.map?.invalidateSize();

  async componentWillLoad() {
    await this.ensureLeafletStylesheet();
  }

  componentDidLoad() {
    if (!this.mapEl) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
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

    requestAnimationFrame(() => this.map?.invalidateSize());
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapEl);
    }
    window.addEventListener('resize', this.windowResize);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.windowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
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

  private async ensureLeafletStylesheet(): Promise<void> {
    if (typeof document === 'undefined') return;
    const targets = this.styleTargets();
    await Promise.all(targets.map((t) => this.injectInto(t)));
  }

  private styleTargets(): (Document | ShadowRoot)[] {
    const seen = new Set<Document | ShadowRoot>();
    const result: (Document | ShadowRoot)[] = [];
    let node: Node | null = this.hostElement;
    while (node) {
      const root = node.getRootNode() as Document | ShadowRoot;
      if (!seen.has(root)) {
        seen.add(root);
        result.push(root);
      }
      node = root instanceof ShadowRoot ? root.host : null;
    }
    return result;
  }

  private async injectInto(root: Document | ShadowRoot): Promise<void> {
    const target: ParentNode =
      root instanceof Document ? root.head : (root as ShadowRoot);
    const existing = (target as ParentNode).querySelector(
      `link[data-mb-leaflet][href="${LEAFLET_CSS_HREF}"]`,
    ) as HTMLLinkElement | null;
    if (existing) {
      if (existing.sheet) return;
      await new Promise<void>((resolve) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => resolve(), { once: true });
      });
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_HREF;
    link.crossOrigin = '';
    link.setAttribute('data-mb-leaflet', '');
    const loaded = new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
    (target as Node).appendChild(link);
    await loaded;
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
