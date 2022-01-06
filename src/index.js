import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { gsap } from 'gsap'

let groundMesh;
let scene, camera, renderer, selectedObject;
let fieldGroup;
let composer, effectFXAA, outlinePass;

let selectedObjects = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const clock = new THREE.Clock();

window.addEventListener( 'resize', onWindowResize, false );

init();
animate();


function createFieldScene(){

    // create field scene group (represents the GLTF scene import for now, I'll explain if you have questions)
    fieldGroup = new THREE.Group();

    // Adding lighting
    const fieldAmbientLight = new THREE.AmbientLight( 'white', 0.4 );
    const fieldDirectionalLight = new THREE.DirectionalLight( 'yellow', 0.8);
    fieldDirectionalLight.position.set(3, 4, 3);

    // build doors with a lazy layout - doors will need specific names in your 3D model scene
    const doorGeometry = new THREE.BoxGeometry( 0.8, 1.9, 0.08 );
    const doorMaterial = new THREE.MeshLambertMaterial();

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


function createRoomScene(){

    // create field scene group (represents the GLTF scene import for now, I'll explain if you have questions)
    roomGroup = new THREE.Group();
    roomGroup.position.set(0, 0, 0);

    // Adding lighting
    const roomAmbientLight = new THREE.AmbientLight( 'white', 0.4 );
    const roomDirectionalLight = new THREE.DirectionalLight( 'yellow', 0.8);
    roomDirectionalLight.position.set(3, 4, 3);

    // build doors with a lazy layout - doors will need specific names in your 3D model scene
    const wallGeometry = new THREE.BoxGeometry( 6, 6, 1 );
    const wallMaterial = new THREE.MeshLambertMaterial({
        color: 'blue',
    });
    const wallMesh1 = new THREE.Mesh(wallGeometry, wallMaterial );
    const wallMesh2 = new THREE.Mesh(wallGeometry, wallMaterial );
    const wallMesh3 = new THREE.Mesh(wallGeometry, wallMaterial );
    const wallMesh4 = new THREE.Mesh(wallGeometry, wallMaterial );
    wallMesh1.position.set(0, 3, 4);
    wallMesh2.position.set(0, 3, -4);
    wallMesh3.position.set(4, 3, 0);
    wallMesh3.rotation.y = Math.PI * 0.5;
    wallMesh4.position.set(-4, 3, 0);
    wallMesh4.rotation.y = Math.PI * 0.5;

    roomGroup.add( roomAmbientLight, roomDirectionalLight, wallMesh1, wallMesh2, wallMesh3, wallMesh4 );
    // currently the boolean for different controls etc is a visible command, but the group is also removed and added to the scene as well. 
    //you cant have the group in the scene and invisible as it triggers the raycaster(I will use layers to solve this), 
    //I couldn't find a good boolean statement for finding if a named group was in the scene or not, 
    // so at the moment its messy.
    // the cleaner solution is to do a find if(group in scene = true){} or put the raycast objects in a dedicated layer (I will do this at some point anyway)
    roomGroup.visible = false;
}


function fieldSceneControls(){
    // these are the view controls when you are in the field.
    camera.rotation.y += 0.03 * ( - ( mouse.x * .15 ) - camera.rotation.y );
    camera.rotation.x += 0.03 * ( (mouse.y * .15) - camera.rotation.x );
    camera.rotation.z = 0;
}


function roomSceneControls(){
    // new controls while in a room, so you can look 360.
    
    camera.rotation.y += 0.03 * ( - ( mouse.x * 7 ) - camera.rotation.y );
    camera.rotation.x += 0.03 * ( (mouse.y * 1) - camera.rotation.x );
    camera.rotation.z = 0
}


function addSelectedObject( object ) {

    selectedObjects = [];
    selectedObjects.push( object );

}


function castingRay() {

    raycaster.setFromCamera( mouse, camera );

    const intersects = raycaster.intersectObject( scene, true );

    if ( intersects.length > 0 ) {

        selectedObject = intersects[ 0 ].object;
        addSelectedObject( selectedObject );
        outlinePass.selectedObjects = selectedObjects;
        document.addEventListener( 'click', onDoorClick, false);

    } else {

        outlinePass.selectedObjects = [];
        document.removeEventListener( 'click', onDoorClick);
    }
}


function init() {

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 50 );
    camera.position.z = 1;
    // this is needed for normal camera looking, otherwise it goes fucked.
    camera.rotation.order = 'YXZ'

    scene = new THREE.Scene();

    // add the object groups representing our scenes
    createFieldScene();
    createRoomScene();

    //renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    //camera controls are not longer needed as we have our own functions #greyhat

    // postprocessing
    composer = new EffectComposer( renderer );
    const renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );

    //create outline
    outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    outlinePass.visibleEdgeColor.set = '#FFFFFF'
    outlinePass.hiddenEdgeColor.set = '190a05'
    outlinePass.edgeStrength = Number( 7 );
    outlinePass.edgeThickness = Number( 2 );
    outlinePass.pulsePeriod = Number( 2 );
    outlinePass.edgeGlow = Number( 1 );
    composer.addPass( outlinePass );

    effectFXAA = new ShaderPass( FXAAShader );
    effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
    composer.addPass( effectFXAA );

    // check what device we're using and adjust our camera field of view and input controls accordingly.

    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
        console.log("mobile device");
        camera.fov = 130;
        camera.updateProjectionMatrix();
        document.addEventListener( 'touchmove', onDocumentTouchMove );
    }else{
        console.log("not a mobile device");
        renderer.domElement.style.touchAction = 'none';
        document.addEventListener( 'mousemove', onDocumentMouseMove );
    }
}


function onDocumentMouseMove( event ) {

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}


function onDocumentTouchMove( event ) {

    mouse.x = ( event.touches[0].clientX / window.innerWidth ) * 2 - 1;
    //mouse.y = ( event.touches[0].clientY / window.innerHeight ); 
    //^ I want to set this up to be -1 in the middle of the phone screen and 1 at the bottom of the phone screen but i'm too shit at math.
}


function onDoorClick( event ) {

    console.log('door clicked');
    console.log(selectedObject);

    gsap.to(camera.position, {
        x: selectedObject.position.x,
        y: selectedObject.position.y,
        z: selectedObject.position.z,
        duration: 3,
        onComplete: function (){
            // match new scene position with selected door position
            roomGroup.position.x = selectedObject.position.x
            roomGroup.position.z = selectedObject.position.z

            // small brain visible boolean and scene add / removal.
            roomGroup.visible = true;
            scene.add( roomGroup );

            fieldGroup.visible = false;
            scene.remove( fieldGroup );
        }
    });
}


function animate() {

    requestAnimationFrame( animate );

    //mesh.rotation.x += 0;
    //mesh.rotation.y += 0;

    const delta = clock.getDelta();

    if(fieldGroup.visible == true) {
        fieldSceneControls();
        //fieldSceneAudio();
        // other stuff in field scene, particles etc
    }

    if(roomGroup.visible == true) {
        roomSceneControls();
        //roomSceneAudio();
        // other stuff in field scene, particles etc
    }

    castingRay();
    
    renderer.render( scene, camera );
    //controls.update( delta );

    composer.render();
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

    composer.setSize( window.innerWidth, innerHeight );
    effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
}