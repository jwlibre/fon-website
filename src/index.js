import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

let mesh, groundMesh;
let renderer;
let scene;
let camera;

window.addEventListener( 'resize', onWindowResize, false );

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01 );
    camera.position.z = 1;

    scene = new THREE.Scene();

    // Adding ambient light
    const ambientLight = new THREE.AmbientLight( 'white', 0.4 );
    scene.add(ambientLight);

    // add direction light
    const directionalLight = new THREE.DirectionalLight( 'yellow', 0.8);
    directionalLight.position.set(3, 4, 3);
    scene.add(directionalLight);

    // build basic door
    const geometry = new THREE.BoxGeometry( 0.8, 1.9, 0.08 );
    const material = new THREE.MeshStandardMaterial();

    const doorMesh1 = new THREE.Mesh( geometry, material );
    const doorMesh2 = new THREE.Mesh( geometry, material );
    const doorMesh3 = new THREE.Mesh( geometry, material );

    doorMesh1.position.set( 1, 0, 0 );
    doorMesh2.position.set( 0, 0, 0 );
    doorMesh3.position.set( -1, 0, 0 );

    scene.add( doorMesh1, doorMesh2, doorMesh3 );

    // build floor
    const groundGeometry = new THREE.CylinderBufferGeometry(30, 30, 0.5, 32, 1);

    groundMesh = new THREE.Mesh( groundGeometry, material );
    groundMesh.position.y = -0.7
    scene.add( groundMesh );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    const controls = new OrbitControls( camera, renderer.domElement );

    //controls.update() must be called after any manual changes to the camera's transform
    controls.update();

}

function animate() {

    requestAnimationFrame( animate );

    //mesh.rotation.x += 0;
    //mesh.rotation.y += 0;

    renderer.render( scene, camera );

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}