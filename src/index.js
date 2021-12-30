import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {FlyControls} from "three/examples/jsm/controls/FlyControls";

let mesh, groundMesh;
let renderer;
let scene;
let camera, controls;

let targetX = 0;
let targetY = 0;
let mouseX = 0;
let mouseY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

const clock = new THREE.Clock();

window.addEventListener( 'resize', onWindowResize, false );

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 50 );
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


    controls = new FlyControls( camera, renderer.domElement );
    controls.movementSpeed = 0;
    controls.domElement = renderer.domElement;
    controls.rollSpeed = Math.PI / 10;
    controls.autoForward = false;
    controls.dragToLook = false;

    controls.minAzimuthAngle = -1; // default
    controls.maxAzimuthAngle = 1; // default
    
    controls.minPolarAngle = 0; // default
    controls.maxPolarAngle = 0; // default


    document.addEventListener( 'mousemove', onDocumentMouseMove );
}

function onDocumentMouseMove( event ) {

    mouseX = ( event.clientX - windowHalfX );
    mouseY = ( event.clientY - windowHalfY );

}

function animate() {

    requestAnimationFrame( animate );

    //mesh.rotation.x += 0;
    //mesh.rotation.y += 0;

    render();

}

function render() {

    const delta = clock.getDelta();

    targetX = mouseX * .001;
    targetY = mouseY * .001;

    camera.rotation.y += 0.08 * ( - targetX - camera.rotation.y );
    camera.rotation.x += 0.08 * ( - targetY - camera.rotation.x );
    camera.rotation.z = 0;
    
    renderer.render( scene, camera );
    controls.update( delta );

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}