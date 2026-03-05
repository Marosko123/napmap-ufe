import { Component, Host, Prop, State, h, EventEmitter, Event } from '@stencil/core';
import { StationsApiFactory, Station } from '../../api/napmap';

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
    this.isValid = true;
    for (let i = 0; i < this.formElement.children.length; i++) {
      const element = this.formElement.children[i];
      if ("reportValidity" in element) {
        const valid = (element as HTMLInputElement).reportValidity();
        this.isValid &&= valid;
      }
    }
    return target.value;
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

          <md-filled-select
            label="Typ paliva"
            value={this.station?.fuels?.[0]}
            oninput={(ev: InputEvent) => {
              if (this.station) {
                this.station.fuels = [this.handleInputEvent(ev)] as any;
              }
            }}>
            <md-icon slot="leading-icon">local_gas_station</md-icon>
            <md-select-option value="ELECTRIC">
              <div slot="headline">Elektrická energia</div>
            </md-select-option>
            <md-select-option value="HYDROGEN">
              <div slot="headline">Vodík</div>
            </md-select-option>
            <md-select-option value="CNG">
              <div slot="headline">CNG</div>
            </md-select-option>
            <md-select-option value="LNG">
              <div slot="headline">LNG</div>
            </md-select-option>
            <md-select-option value="LPG">
              <div slot="headline">LPG</div>
            </md-select-option>
          </md-filled-select>

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
              required
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
              required
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

          <md-filled-text-field
            label="Konektory (oddelené čiarkou)"
            value={this.station?.connectors?.join(', ')}
            oninput={(ev: InputEvent) => {
              if (this.station) {
                const value = this.handleInputEvent(ev);
                this.station.connectors = value ? value.split(',').map(s => s.trim()) : [];
              }
            }}>
            <md-icon slot="leading-icon">power</md-icon>
          </md-filled-text-field>

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
