import { Component, Host, Prop, State, h } from '@stencil/core';

declare global {
  interface Window { navigation: any; }
}

@Component({
  tag: 'mb-napmap-app',
  shadow: true,
})
export class MbNapmapApp {

  @State() private relativePath = "";

  @Prop() basePath: string = "";
  @Prop() apiBase: string;

  componentWillLoad() {
    const baseUri = new URL(this.basePath, document.baseURI || "/").pathname;

    const toRelative = (path: string) => {
      if (path.startsWith(baseUri)) {
        this.relativePath = path.slice(baseUri.length)
      } else {
        this.relativePath = ""
      }
    }

    window.navigation?.addEventListener("navigate", (ev: Event) => {
      if ((ev as any).canIntercept) { (ev as any).intercept(); }
      let path = new URL((ev as any).destination.url).pathname;
      toRelative(path);
    });

    toRelative(location.pathname)
  }

  render() {
    let element = "list"
    let stationId = "@new"

    if (this.relativePath.startsWith("station/")) {
      element = "editor";
      stationId = this.relativePath.split("/")[1]
    }

    const navigate = (path: string) => {
      const absolute = new URL(path, new URL(this.basePath, document.baseURI)).pathname;
      window.navigation.navigate(absolute)
    }

    return (
      <Host>
        {element === "editor"
          ? <mb-napmap-editor
              station-id={stationId}
              api-base={this.apiBase}
              oneditor-closed={() => navigate("./list")}>
            </mb-napmap-editor>
          : <mb-napmap-list
              api-base={this.apiBase}
              onstation-clicked={(ev: CustomEvent<string>) => navigate("./station/" + ev.detail)}>
            </mb-napmap-list>
        }
      </Host>
    );
  }
}
