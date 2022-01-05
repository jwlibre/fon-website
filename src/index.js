import * as THREE from 'three';
import {FlyControls} from "three/examples/jsm/controls/FlyControls";

let mesh, groundMesh;

let scene, camera, controls, renderer, raycaster, INTERSECTED;
let fieldGroup, room1Group, room2Group;
let pointer = new THREE.Vector2();

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

function createFieldScene(){

        /**
         * I've created this function to isolate the scene creation from init(), this will make more sense and help workflow once we're using
         * the GLTFLoader to insert custom 3D models and give us some flexibility regarding when models are loaded 
         * (e.g. all at the beginning or when we enter a new room). We can use eventlistener tirggered arguments in this function to trigger 
         * the correct filename load and call the audio load function as well, which should greatly reduce our code
         * 
         * for now it just makes the same shit we already had :)
         */

        // create field scene group (represents the GLTF scene import for now, I'll explain if you have questions)
        fieldGroup = new THREE.Group();

        // Adding lighting
        const fieldAmbientLight = new THREE.AmbientLight( 'white', 0.4 );
        const fieldDirectionalLight = new THREE.DirectionalLight( 'yellow', 0.8);
        fieldDirectionalLight.position.set(3, 4, 3);
    
        // build doors with a lazy layout - doors will need specific names in your 3D model scene
        const doorGeometry = new THREE.BoxGeometry( 0.8, 1.9, 0.08 );
        const doorMaterial = new THREE.MeshStandardMaterial();
    
        for (let i = 0; i < 10; i++) {
            const door = new THREE.Mesh( doorGeometry, doorMaterial );
            door.position.x = i - 5;
            door.position.z = - 3;
            fieldGroup.add(door);
          }
        
        // build floor
        const groundGeometry = new THREE.CylinderBufferGeometry(30, 30, 0.5, 32, 1); 
        groundMesh = new THREE.Mesh( groundGeometry, doorMaterial );
        groundMesh.position.y = -0.7

        fieldGroup.add( fieldAmbientLight, fieldDirectionalLight, groundMesh );

        // Night sky with stars
        const vertices = [];

        for ( let i = 0; i < 10000; i ++ ) {

            const radius = 10;
            const theta = Math.random() * Math.PI;
            const phi = Math.random() * Math.PI;

            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(theta);

            vertices.push( x, y, z );
        }

        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

        const starMaterial = new THREE.PointsMaterial( { color: 0xdddddd, size: 1.5, sizeAttenuation: false } );

        const points = new THREE.Points( starGeometry, starMaterial );

        fieldGroup.add( points );

        scene.add( fieldGroup );
        console.log( fieldGroup );
        }


function fieldSceneControls(){
    camera.rotation.y += 0.03 * ( - targetX - camera.rotation.y );
    camera.rotation.x += 0.03 * ( - targetY - camera.rotation.x );
    camera.rotation.z = 0;
}


function castingRay() {

    // find intersections

    raycaster.setFromCamera( pointer, camera );

    const intersects = raycaster.intersectObjects( scene.children );

    if (intersects.length > 0) {

        console.log("intersection");
        // target the correct item in a mesh and add desired material change etc.

	}

}


function init() {

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 50 );
    camera.position.z = 1;

    scene = new THREE.Scene();
    createFieldScene();

    //raycaster
    raycaster = new THREE.Raycaster();
    
    //renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    //camera controls
    controls = new FlyControls( camera, renderer.domElement );
    controls.movementSpeed = 0;
    controls.rollSpeed = Math.PI / 10;

    document.addEventListener( 'mousemove', onDocumentMouseMove );
}


function onDocumentMouseMove( event ) {

    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}


function animate() {

    requestAnimationFrame( animate );

    //mesh.rotation.x += 0;
    //mesh.rotation.y += 0;

    render();
}


function render() {

    const delta = clock.getDelta();

    targetX = pointer.x * .1;
    targetY = pointer.y * .1;

    if(fieldGroup.visible == true) {
        fieldSceneControls();
        //fieldSceneAudio();
        // other stuff in field scene, particles etc
    }

    castingRay();
    
    renderer.render( scene, camera );
    controls.update( delta );
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}