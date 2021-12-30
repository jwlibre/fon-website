<h2>Developer Guide</h2>

<h3>Setup</h3>

- Install node.js and npm (follow the instructions here: https://phoenixnap.com/kb/install-node-js-npm-on-windows for installation).
- Clone this repo.
- Run `npm install` to install the required modules in your `node_modules` folder.


<h3>Directory structure</h3>

```
.
├── dist // contains optimised production-ready files
├── node_modules // contains node.js modules (can be ignored)
├── package-lock.json
├── package.json // configuration for this project
├── readme.md
└── src
    ├── assets // e.g. blender files, materials, exported objects
    ├── img // static images
    ├── index.html // webpage
    ├── index.js // javascript for webpage
    └── styles.css // css style bits
```

- All changes will be made directly in files in the src folder.
- No need to touch the dist folder - files are output here automatically by parcel, ready for publication!

<h3>Scripts</h3>

- `npm run start` - opens the src/index.html file in a dev server.
- `npm run build` - creates the dist folder, and then builds and minifies the src files into the output files into the dist folder, ready to be published.
