import { Component, Host, Prop, State, h, EventEmitter, Event } from '@stencil/core';
import { StationsApiFactory, Station } from '../../api/napmap';

const FUEL_OPTIONS: ReadonlyArray<{ value: Station["fuels"][number]; label: string }> = [
  { value: "ELECTRIC", label: "Elektrina" },
  { value: "HYDROGEN", label: "Vodík" },
  { value: "CNG", label: "CNG" },
  { value: "LNG", label: "LNG" },
  { value: "LPG", label: "LPG" },
];

const CONNECTOR_OPTIONS = [
  "CCS2", "Type2", "CHAdeMO", "Tesla", "GB/T", "H2-700bar", "H2-350bar"
];

@Component({
  tag: 'mb-napmap-editor',
  styleUrl: 'mb-napmap-editor.css',
  shadow: true,
})
export class MbNapmapEditor {

  @Prop() stationId: string;
  @Prop() apiBase: string;

  @Event({ eventName: "editor-closed" }) editorClosed: EventEmitter<string>;

  @State() station: Station;
  @State() errorMessage: string;
  @State() isValid: boolean = false;
  @State() isLoading: boolean = true;
  @State() maxPower: number = 50;

  private formElement: HTMLFormElement;

  private async getStationAsync(): Promise<Station> {
    if (this.stationId === "@new") {
      this.isValid = false;
      this.isLoading = false;
      this.station = {
        id: "@new",
        name: "",
        stationType: "CHARGING",
        fuels: ["ELECTRIC"],
        operatorName: "",
        address: "",
        city: "",
        country: "SK",
        lat: 48.1486,
        lng: 17.1077,
        openingHours: "",
        maxPowerKw: 50,
        connectors: [],
        services: [],
        status: "ACTIVE"
      };
      this.maxPower = 50;
      return this.station;
    }

    if (!this.stationId) {
      this.isValid = false;
      this.isLoading = false;
      return undefined;
    }

    try {
      const response = await StationsApiFactory(undefined, this.apiBase)
        .getStation(this.stationId);

      if (response.status < 299) {
        this.station = response.data;
        this.maxPower = this.station.maxPowerKw || 50;
        this.isValid = true;
        this.isLoading = false;
      } else {
        this.errorMessage = `Nepodarilo sa načítať stanicu: ${response.statusText}`;
        this.isLoading = false;
      }
    } catch (err: any) {
      this.errorMessage = `Nepodarilo sa načítať stanicu: ${err.message || "neznáma chyba"}`;
      this.isLoading = false;
    }
    return undefined;
  }

  componentWillLoad() {
    this.getStationAsync();
  }

  private handleInputEvent(ev: InputEvent): string {
    const target = ev.target as HTMLInputElement;
    this.recomputeValidity();
    return target.value;
  }

  private recomputeValidity() {
    if (!this.formElement || !this.station) { this.isValid = false; return; }
    let valid = true;
    for (let i = 0; i < this.formElement.children.length; i++) {
      const element = this.formElement.children[i];
      if ("checkValidity" in element) {
        valid = valid && (element as HTMLInputElement).checkValidity();
      }
    }
    valid = valid && (this.station.fuels?.length ?? 0) >= 1;
    this.isValid = valid;
  }

  private toggleFuel(value: Station["fuels"][number]) {
    if (!this.station) return;
    const set = new Set(this.station.fuels ?? []);
    if (set.has(value)) { set.delete(value); } else { set.add(value); }
    this.station = { ...this.station, fuels: Array.from(set) as Station["fuels"] };
    this.recomputeValidity();
  }

  private toggleConnector(value: string) {
    if (!this.station) return;
    const set = new Set(this.station.connectors ?? []);
    if (set.has(value)) { set.delete(value); } else { set.add(value); }
    this.station = { ...this.station, connectors: Array.from(set) };
  }

  private async updateStation() {
    try {
      const api = StationsApiFactory(undefined, this.apiBase);
      const response = this.stationId === "@new"
        ? await api.createStation(this.station)
        : await api.updateStation(this.stationId, this.station);

      if (response.status < 299) {
        this.editorClosed.emit("store");
      } else {
        this.errorMessage = `Nepodarilo sa uložiť stanicu: ${response.statusText}`;
      }
    } catch (err: any) {
      this.errorMessage = `Nepodarilo sa uložiť stanicu: ${err.message || "neznáma chyba"}`;
    }
  }

  private async deleteStation() {
    try {
      const response = await StationsApiFactory(undefined, this.apiBase)
        .deleteStation(this.stationId);

      if (response.status < 299) {
        this.editorClosed.emit("delete");
      } else {
        this.errorMessage = `Nepodarilo sa zmazať stanicu: ${response.statusText}`;
      }
    } catch (err: any) {
      this.errorMessage = `Nepodarilo sa zmazať stanicu: ${err.message || "neznáma chyba"}`;
    }
  }

  render() {
    if (this.errorMessage) {
      return (
        <Host>
          <div class="error">{this.errorMessage}</div>
          <md-outlined-button onClick={() => this.editorClosed.emit("cancel")}>
            Späť
          </md-outlined-button>
        </Host>
      );
    }

    if (this.isLoading) {
      return (
        <Host>
          <div class="loading">Načítavam...</div>
        </Host>
      );
    }

    return (
      <Host>
        <h2>{this.stationId === "@new" ? "Nová stanica" : "Upraviť stanicu"}</h2>

        <form ref={el => this.formElement = el}>
          <md-filled-text-field
            label="Názov stanice"
            required
            minlength={3}
            maxlength={80}
            error-text="Zadajte 3 až 80 znakov"
            value={this.station?.name}
            oninput={(ev: InputEvent) => {
              if (this.station) { this.station.name = this.handleInputEvent(ev); }
            }}>
            <md-icon slot="leading-icon">ev_station</md-icon>
          </md-filled-text-field>

          <md-filled-select
            label="Typ stanice"
            value={this.station?.stationType}
            oninput={(ev: InputEvent) => {
              if (this.station) {
                this.station.stationType = this.handleInputEvent(ev) as any;
              }
            }}>
            <md-icon slot="leading-icon">category</md-icon>
            <md-select-option value="CHARGING">
              <div slot="headline">Nabíjacia</div>
            </md-select-option>
            <md-select-option value="REFUELING">
              <div slot="headline">Čerpacia</div>
            </md-select-option>
          </md-filled-select>

          <div class="chip-group">
            <span class="chip-label">
              <md-icon>local_gas_station</md-icon>
              Palivá (vyberte aspoň jedno)
            </span>
            <md-chip-set>
              {FUEL_OPTIONS.map(opt => (
                <md-filter-chip
                  key={opt.value}
                  label={opt.label}
                  selected={this.station?.fuels?.includes(opt.value)}
                  onClick={() => this.toggleFuel(opt.value)}>
                </md-filter-chip>
              ))}
            </md-chip-set>
          </div>

          <md-filled-text-field
            label="Prevádzkovateľ"
            required
            value={this.station?.operatorName}
            oninput={(ev: InputEvent) => {
              if (this.station) { this.station.operatorName = this.handleInputEvent(ev); }
            }}>
            <md-icon slot="leading-icon">business</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            label="Adresa"
            required
            value={this.station?.address}
            oninput={(ev: InputEvent) => {
              if (this.station) { this.station.address = this.handleInputEvent(ev); }
            }}>
            <md-icon slot="leading-icon">home</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            label="Mesto"
            required
            value={this.station?.city}
            oninput={(ev: InputEvent) => {
              if (this.station) { this.station.city = this.handleInputEvent(ev); }
            }}>
            <md-icon slot="leading-icon">location_city</md-icon>
          </md-filled-text-field>

          <div class="coordinates">
            <md-filled-text-field
              label="GPS šírka (lat)"
              type="number"
              step="0.0001"
              min={-90}
              max={90}
              required
              error-text="Hodnota -90 až 90"
              value={this.station?.lat?.toString()}
              oninput={(ev: InputEvent) => {
                if (this.station) { this.station.lat = parseFloat(this.handleInputEvent(ev)); }
              }}>
              <md-icon slot="leading-icon">my_location</md-icon>
            </md-filled-text-field>

            <md-filled-text-field
              label="GPS dĺžka (lng)"
              type="number"
              step="0.0001"
              min={-180}
              max={180}
              required
              error-text="Hodnota -180 až 180"
              value={this.station?.lng?.toString()}
              oninput={(ev: InputEvent) => {
                if (this.station) { this.station.lng = parseFloat(this.handleInputEvent(ev)); }
              }}>
              <md-icon slot="leading-icon">my_location</md-icon>
            </md-filled-text-field>
          </div>

          <md-filled-text-field
            label="Otváracie hodiny"
            value={this.station?.openingHours}
            oninput={(ev: InputEvent) => {
              if (this.station) { this.station.openingHours = this.handleInputEvent(ev); }
            }}>
            <md-icon slot="leading-icon">schedule</md-icon>
          </md-filled-text-field>

          <div class="power-slider">
            <span class="label">Maximálny výkon: {this.maxPower} kW</span>
            <md-slider
              min="0"
              max="350"
              value={this.station?.maxPowerKw || 50}
              ticks
              labeled
              oninput={(ev: InputEvent) => {
                if (this.station) {
                  this.station.maxPowerKw = parseInt(this.handleInputEvent(ev));
                  this.maxPower = this.station.maxPowerKw;
                }
              }}>
            </md-slider>
          </div>

          <div class="chip-group">
            <span class="chip-label">
              <md-icon>power</md-icon>
              Konektory
            </span>
            <md-chip-set>
              {CONNECTOR_OPTIONS.map(opt => (
                <md-filter-chip
                  key={opt}
                  label={opt}
                  selected={this.station?.connectors?.includes(opt)}
                  onClick={() => this.toggleConnector(opt)}>
                </md-filter-chip>
              ))}
            </md-chip-set>
          </div>

          <md-filled-text-field
            label="Služby (oddelené čiarkou)"
            value={this.station?.services?.join(', ')}
            oninput={(ev: InputEvent) => {
              if (this.station) {
                const value = this.handleInputEvent(ev);
                this.station.services = value ? value.split(',').map(s => s.trim()) : [];
              }
            }}>
            <md-icon slot="leading-icon">miscellaneous_services</md-icon>
          </md-filled-text-field>
        </form>

        <md-divider inset></md-divider>

        <div class="actions">
          <md-filled-tonal-button
            id="delete"
            disabled={!this.station || this.stationId === "@new"}
            onClick={() => this.deleteStation()}>
            <md-icon slot="icon">delete</md-icon>
            Zmazať
          </md-filled-tonal-button>
          <span class="stretch-fill"></span>
          <md-outlined-button
            id="cancel"
            onClick={() => this.editorClosed.emit("cancel")}>
            Zrušiť
          </md-outlined-button>
          <md-filled-button
            id="confirm"
            disabled={!this.isValid}
            onClick={() => this.updateStation()}>
            <md-icon slot="icon">save</md-icon>
            Uložiť
          </md-filled-button>
        </div>
      </Host>
    );
  }
}
