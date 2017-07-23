# erhathaway.github.io

A work in progress personal site and portfolio.

## Dev Notes

Built using React, Redux, Redux Sagas, Radium, GraphQL, Jest, ESLint, and Webpack

Patterns embraced:

  - GraphQL for API calls
  - Redux for state management
  - Inline styles with help from Radium
  - Sagas (async and generator functions) for all transactional async logic

Future directions:

- Make app universal:
  - render mockups using `React sketch app`
  - switch over to `React Primitives` for JSX
  - add React Native support using `React Primitives`

## Run

1. Install `npm` ~v4 and `node` ~v7
2. Install dependencies: `npm install`
3. (1) Run dev server or (2) build and deploy:
  - (1) Run dev server: `npm run start`

  - (2) Build and deploy
    1. Build source into static content: `npm run build`
    2. Deploy `/index.html` and `/static` folder to a site

## Development

- Run tests: `npm run test`
- Run linter: `npm run lint`
- Build development content `npm run build-dev`

## Design

### Mockups

Current design mockups can be found in [/design/Portfolio.sketch](/design/Portfolio.sketch)

### Colors

Current color scheme: https://coolors.co/5bc0eb-fde74c-9bc53d-e55934-fa7921

```
rgba(91, 192, 235, 1);
rgba(253, 231, 76, 1);
rgba(155, 197, 61, 1);
rgba(229, 89, 52, 1);
rgba(250, 121, 33, 1);
```
