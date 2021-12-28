<h2>Developer Guide</h2>
<h3>Setup</h3>
- Install node.js and npm (follow the instructions [here](https://phoenixnap.com/kb/install-node-js-npm-on-windows) for installation).
- Clone this repo.
- Install the requirements: `npm install`. This will install all the necessary javascript node modules into the node_modules directory.

<h3>Directory structure</h3>
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
- All changes will be made directly in files in the src folder.
- No need to touch the dist folder - files are output here automatically by parcel, ready for publication!

<h3>Scripts</h3>
`npm run start` - opens the src/index.html file in a dev server with https connection.
`npm run build` - creates the dist folder, and builds and minifies the src files into the output files into the dist folder, ready to be published.
