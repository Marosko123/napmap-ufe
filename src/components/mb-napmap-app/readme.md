# mb-napmap-app



<!-- Auto Generated Below -->


## Properties

| Property   | Attribute   | Description | Type     | Default     |
| ---------- | ----------- | ----------- | -------- | ----------- |
| `apiBase`  | `api-base`  |             | `string` | `undefined` |
| `basePath` | `base-path` |             | `string` | `""`        |


## Dependencies

### Depends on

- [mb-napmap-editor](../mb-napmap-editor)
- [mb-napmap-list](../mb-napmap-list)

### Graph
```mermaid
graph TD;
  mb-napmap-app --> mb-napmap-editor
  mb-napmap-app --> mb-napmap-list
  mb-napmap-list --> mb-napmap-map
  style mb-napmap-app fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
