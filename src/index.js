import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { gsap } from 'gsap';

let scene, camera, renderer, selectedObject;
let fieldGroup;
let composer, effectFXAA, outlinePass;
let mixer;

let selectedObjects = [];

// LOADING MANAGER
const manager = new THREE.LoadingManager( () => {
    const loadingScreen = document.getElementById( 'loading-screen' );
    loadingScreen.classList.add( 'fade-out' );
    // optional: remove loader from DOM via event listener
    loadingScreen.addEventListener( 'transitionend', onTransitionEnd );
});
// manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
// 	console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
// };
// manager.onLoad = function ( ) {
// 	console.log( 'Loading complete!');
// };
// manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
// 	console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
// };
// manager.onError = function ( url ) {
// 	console.log( 'There was an error loading ' + url );
// };
function onTransitionEnd( event ) {
	event.target.remove();
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const clock = new THREE.Clock();

window.addEventListener( 'resize', onWindowResize, false );

// Grass texture loader with diffuse and alpha
let grassLoader = new THREE.TextureLoader();
let diffuse = grassLoader.load('img/grass_full.png');
let alpha = grassLoader.load( 'img/grass_full_alpha.jpg' );

// Grass shaders
const vertexShader = `
  varying vec2 vUv;
  uniform float time;
  
	void main() {

    vUv = uv;
    
    // VERTEX POSITION
    
    vec4 mvPosition = vec4( position, 1.0 );
    #ifdef USE_INSTANCING
    	mvPosition = instanceMatrix * mvPosition;
    #endif
    
    // DISPLACEMENT
    
    // here the displacement is made stronger on the blades tips.
    float dispPower = 1.0 - cos( uv.y * 3.1416 / 2.0 );
    
    float displacement = sin( mvPosition.z + time * 1.0 ) * ( 0.05 * dispPower );
    mvPosition.z += displacement;
    
    //
    
    vec4 modelViewPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * modelViewPosition;

	}
`;

const fragmentShader = `
  uniform sampler2D map;
  uniform sampler2D alphaMap;
  varying vec2 vUv;
  
  void main() {
  
    //If transparent, don't draw
  if(texture2D(alphaMap, vUv).r < 0.15){
    discard;
  }
  
/*   	vec3 baseColor = vec3( 0.41, 1.0, 0.5 );
  	    float clarity = ( vUv.y * 0.5 ) + 0.5;
  	    gl_FragColor = vec4( baseColor * clarity, 1 ); */
        
  gl_FragColor = texture2D(map, vUv);
  }
`;

const uniforms = {
  time: {
    value: 0
  },
  map: {
    type: 't',
    value: diffuse
  },
  alphaMap: { value: alpha }
}

const leavesMaterial = new THREE.ShaderMaterial({
  uniforms,
	vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
});

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
    const doorGeometry = new THREE.BoxGeometry( 1, 2.5, 0.08 );
    const doorMaterial = new THREE.MeshLambertMaterial();
    doorMaterial.color = new THREE.Color(0xff0000);

    const doorLocations = new Array();
    doorLocations.push(new THREE.Vector3(0, 0, -6)); //1
    doorLocations.push(new THREE.Vector3(-1.8, 0, -12)); //2
    doorLocations.push(new THREE.Vector3(3.4, 0, -19)); //3
    doorLocations.push(new THREE.Vector3(-6, 0, -23)); //4
    doorLocations.push(new THREE.Vector3(6.4, 0, -26)); //5
    doorLocations.push(new THREE.Vector3(-10, 0, -29)); //6?
    doorLocations.push(new THREE.Vector3(15, 0, -30)); //7?
    doorLocations.push(new THREE.Vector3(-15, 0, -28)); //8?
    doorLocations.push(new THREE.Vector3(12, 0, -35)); //9?
    doorLocations.push(new THREE.Vector3(-16, 0, -36)); //10

    for (let i = 0; i < 10; i++) {
        const door = new THREE.Mesh( doorGeometry, doorMaterial );
        door.position.x = doorLocations[i].x;
        door.position.y = doorLocations[i].y;
        // door.position.y = 0;
        door.position.z = doorLocations[i].z;
        door.layers.enable( 1 );
        fieldGroup.add(door);
        }
    
    // const dracoLoader = new DRACOLoader();
    // dracoLoader.setDecoderPath( 'js/libs/draco/gltf/' );

    const loader = new GLTFLoader();
    // loader.setDRACOLoader( dracoLoader );

    let groundPoints = [];

    // ANIMATED GRASS
    const instanceNumber = 300000;
    const dummy = new THREE.Object3D();
    loader.load( 'assets/ground_plane_only2.glb', function ( gltf ) {

        const model = gltf.scene;
        model.position.set( 0, 0, -21.5 );
        fieldGroup.add( model );
        console.log(model.children[0])

        const sampler = new MeshSurfaceSampler(model.children[0]).build();
        const tempPosition = new THREE.Vector3();
        const tempObject = new THREE.Object3D();
        const geometry = new THREE.PlaneGeometry( 0.2, 0.5, 1, 4 );
        geometry.translate( 0, 0.25, 0 ); // move grass blade geometry lowest point at 0.
    
        const instancedMesh = new THREE.InstancedMesh( geometry, leavesMaterial, instanceNumber );
    
        fieldGroup.add( instancedMesh );

        for ( let i=0 ; i<instanceNumber ; i++ ) {
            // console.log(tempPosition);
            sampler.sample(tempPosition);
            dummy.position.x = tempPosition.x;
            dummy.position.y = tempPosition.y;
            dummy.position.z = tempPosition.z -21.5;
        
        dummy.scale.setScalar( 0.5 + Math.random() * 2 );
        
        dummy.rotation.y = Math.random() * Math.PI;
        
        dummy.updateMatrix();
        instancedMesh.setMatrixAt( i, dummy.matrix );
    
        }

    }, undefined, function ( e ) {

        console.error( e );

    } );

    fieldGroup.add( fieldAmbientLight, fieldDirectionalLight );

    // skybox
    const skybox_loader = new THREE.CubeTextureLoader();
    const skybox_texture = skybox_loader.load([
    'img/night_right.png',
    'img/night_left.png',
    'img/night_up.png',
    'img/night_down.png',
    'img/night_back.png',
    'img/night_front.png',
    ]);
    scene.background = skybox_texture;

    // AUDIO
    var audioLoader = new THREE.AudioLoader(manager);
    var listener = new THREE.AudioListener();
    var audio = new THREE.Audio(listener);
    audioLoader.load('audio/scott-buckley-i-walk-with-ghosts.mp3', function(buffer) {
        audio.setBuffer(buffer);
        audio.setLoop(true);
        audio.play();
    });

    scene.add( fieldGroup );
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
    camera.position.y = 0.9;

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

    //raycaster layers
    raycaster.layers.set( 1 );

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

    leavesMaterial.uniforms.time.value = clock.getElapsedTime();
    leavesMaterial.uniformsNeedUpdate = true;

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