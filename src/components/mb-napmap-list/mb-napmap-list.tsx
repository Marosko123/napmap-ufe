import { Component, Event, EventEmitter, Host, Prop, State, h } from '@stencil/core';
import { StationsApiFactory, Station } from '../../api/napmap';

@Component({
  tag: 'mb-napmap-list',
  styleUrl: 'mb-napmap-list.css',
  shadow: true,
})
export class MbNapmapList {
  @Event({ eventName: "station-clicked" }) stationClicked: EventEmitter<string>;
  @Prop() apiBase: string;
  @State() errorMessage: string;
  @State() isLoading: boolean = true;

  @State() filterCity: string = "";
  @State() filterFuel: string = "";
  @State() filterType: string = "";

  stations: Station[] = [];

  private async getStationsAsync(): Promise<Station[]> {
    this.isLoading = true;
    try {
      const params: any = {};
      if (this.filterCity) params.city = this.filterCity;
      if (this.filterFuel) params.fuel = this.filterFuel;
      if (this.filterType) params.stationType = this.filterType;

      const response = await StationsApiFactory(undefined, this.apiBase)
        .getStations(
          this.filterCity || undefined,
          this.filterFuel as any || undefined,
          this.filterType as any || undefined,
          undefined,
          undefined,
          undefined
        );

      if (response.status < 299) {
        this.isLoading = false;
        return response.data;
      } else {
        this.errorMessage = `Nepodarilo sa načítať zoznam staníc: ${response.statusText}`
      }
    } catch (err: any) {
      this.errorMessage = `Nepodarilo sa načítať zoznam staníc: ${err.message || "neznáma chyba"}`
    }
    this.isLoading = false;
    return [];
  }

  async componentWillLoad() {
    this.stations = await this.getStationsAsync();
  }

  private async handleFilterChange() {
    this.stations = await this.getStationsAsync();
  }

  private getFuelIcon(fuels: string[]): string {
    if (fuels.includes('ELECTRIC')) return 'ev_station';
    if (fuels.includes('HYDROGEN')) return 'water_drop';
    if (fuels.includes('CNG') || fuels.includes('LNG') || fuels.includes('LPG')) return 'local_gas_station';
    return 'place';
  }

  private formatFuels(fuels: string[]): string {
    return fuels.join(', ');
  }

  render() {
    return (
      <Host>
        <div class="filters">
          <md-filled-text-field
            label="Mesto"
            value={this.filterCity}
            oninput={(ev: InputEvent) => {
              this.filterCity = (ev.target as HTMLInputElement).value;
            }}
            onchange={() => this.handleFilterChange()}>
            <md-icon slot="leading-icon">location_city</md-icon>
          </md-filled-text-field>

          <md-filled-select
            label="Typ paliva"
            value={this.filterFuel}
            oninput={(ev: InputEvent) => {
              this.filterFuel = (ev.target as HTMLInputElement).value;
              this.handleFilterChange();
            }}>
            <md-icon slot="leading-icon">local_gas_station</md-icon>
            <md-select-option value="">
              <div slot="headline">Všetky</div>
            </md-select-option>
            <md-select-option value="ELECTRIC">
              <div slot="headline">Elektrická</div>
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

          <md-filled-select
            label="Typ stanice"
            value={this.filterType}
            oninput={(ev: InputEvent) => {
              this.filterType = (ev.target as HTMLInputElement).value;
              this.handleFilterChange();
            }}>
            <md-icon slot="leading-icon">category</md-icon>
            <md-select-option value="">
              <div slot="headline">Všetky</div>
            </md-select-option>
            <md-select-option value="CHARGING">
              <div slot="headline">Nabíjacia</div>
            </md-select-option>
            <md-select-option value="REFUELING">
              <div slot="headline">Čerpacia</div>
            </md-select-option>
          </md-filled-select>
        </div>

        {this.errorMessage
          ? <div class="error">{this.errorMessage}</div>
          : this.isLoading
            ? <div class="loading">Načítavam...</div>
            : <md-list>
                {this.stations.length === 0
                  ? <md-list-item>
                      <div slot="headline">Žiadne stanice</div>
                      <div slot="supporting-text">Neboli nájdené žiadne stanice podľa zadaných filtrov</div>
                    </md-list-item>
                  : this.stations.map((station) =>
                      <md-list-item onClick={() => this.stationClicked.emit(station.id)}>
                        <div slot="headline">{station.name}</div>
                        <div slot="supporting-text">
                          {station.address}, {station.city} • {this.formatFuels(station.fuels)}
                          {station.maxPowerKw ? ` • ${station.maxPowerKw} kW` : ''}
                        </div>
                        <md-icon slot="start">{this.getFuelIcon(station.fuels)}</md-icon>
                      </md-list-item>
                    )
                }
              </md-list>
        }

        <md-filled-icon-button class="add-button"
          onclick={() => this.stationClicked.emit("@new")}>
          <md-icon>add</md-icon>
        </md-filled-icon-button>
      </Host>
    );
  }
}
