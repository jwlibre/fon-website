import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { gsap } from 'gsap';

const doorLocations = new Array();
doorLocations.push(new THREE.Vector3(0, 0.25, -6)); //1
doorLocations.push(new THREE.Vector3(-1.8, 0.25, -12)); //2
doorLocations.push(new THREE.Vector3(3.4, 0.25, -19)); //3
doorLocations.push(new THREE.Vector3(-6, 0.25, -23)); //4
doorLocations.push(new THREE.Vector3(6.4, 0.25, -26)); //5
doorLocations.push(new THREE.Vector3(-10, 0.25, -29)); //6?
doorLocations.push(new THREE.Vector3(15, 0.25, -30)); //7?
doorLocations.push(new THREE.Vector3(-15, 0.25, -28)); //8?
doorLocations.push(new THREE.Vector3(12, 0.25, -35)); //9?
doorLocations.push(new THREE.Vector3(-16, 0.25, -36)); //10

let scene, camera, renderer, selectedObject;
let fieldGroup;
let composer, effectFXAA, outlinePass;

let loadingPercentage, loadingPercentageText;

let selectedObjects = [];

// LOADING MANAGER
const manager = new THREE.LoadingManager( () => {
    const loadingScreen = document.getElementById( 'loading-screen' );
    loadingScreen.classList.add( 'fade-out' );
    // optional: remove loader from DOM via event listener
    loadingScreen.addEventListener( 'transitionend', onTransitionEnd );
});
manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    loadingPercentage = Math.round((itemsLoaded/itemsTotal)) * 100;
    // console.log(loadingPercentage)
    document.getElementById("loading-percentage").innerHTML = "loading " + loadingPercentage + "%";
    // console.log(loadingPercentageText);
    // loadingPercentageText.innerHTML = loadingPercentage;
       // console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
}
function onTransitionEnd( event ) {
    event.target.remove();
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const clock = new THREE.Clock();

const loader = new GLTFLoader(manager);

window.addEventListener( 'resize', onWindowResize, false );

// Grass texture loader with diffuse and alpha
let grassLoader = new THREE.TextureLoader();
let diffuse = grassLoader.load('img/grass_full_extra2.png');
let alpha = grassLoader.load( 'img/grass_full_extra_alpha.png' );
console.log(alpha)

// shader lighting
var lightPositions = new Array();
for (let i=0 ; i<doorLocations.length ; i++) {
    lightPositions.push(new THREE.Vector3(doorLocations[i].x, doorLocations[i].y, doorLocations[i].z + 1));
};

var Config = function(){
    this.lightColor = '#ef9123';
    this.lightPower = 0.00005;
    this.ambientLightPower = 0.2;
    this.magnitude = 0.6;
    this.instanceNumber = 7500;
};
var config = new Config();

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
    
    float displacement = sin( mvPosition.z + time / 2.0 ) * ( 0.1 * dispPower );
    mvPosition.z += displacement;
    
    //
    
    vec4 modelViewPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * modelViewPosition;

  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D map;
  uniform sampler2D alphaMap;

  void main() {

  //If transparent, don't draw
  if(texture2D(alphaMap, vUv).r < 0.15){
    discard;
  }
  vec4 textureColor = texture2D(map, vec2(vUv.s, vUv.t));
  
  float clarity = ( vUv.y * 0.5 ) + 0.5;
  gl_FragColor = vec4( textureColor * clarity);
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
  alphaMap: { value: alpha },
  lightPos:   { value: lightPositions },
  lightColor: { type: "c", value: new THREE.Color(config.lightColor) },
  magnitude:  { type: "f", value: config.magnitude },
  lightPower: { type: "f", value: config.lightPower },
  ambientLightPower: { type: "f", value: config.ambientLightPower },
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

    fieldGroup = new THREE.Group();

    // Adding lighting
    const fieldAmbientLight = new THREE.AmbientLight( 'white', 0 );
    const fieldDirectionalLight = new THREE.DirectionalLight( 'yellow', 0);
    fieldDirectionalLight.position.set(3, 4, 3);

    const door = loader.load( 'assets/door.glb', function ( gltf ) {
        gltf.scene.traverse(function(child){
            child.castShadow = true;
            child.receiveShadow = true;
        });
        // console.log(doorLight);
        for (let i = 0; i < 10; i++) {
            const doorModel = gltf.scene.clone();
            const doorLight = doorModel.children[1];
            doorLight.target = doorModel;
            doorLight.intensity = 2;
            doorLight.distance = 5;
            doorLight.shadow.bias = -0.1;
            doorModel.position.x = doorLocations[i].x;
            doorModel.position.y = doorLocations[i].y;
            // door.position.y = 0;
            doorModel.position.z = doorLocations[i].z;
            doorModel.children[0].children[3].layers.enable( 1 );
            console.log(doorModel);
            fieldGroup.add(doorModel);
            }
    }, undefined, function ( e ) {

        console.error( e );

    } );

    // ANIMATED GRASS
    const instanceNumber = config.instanceNumber;
    const dummy = new THREE.Object3D();
    loader.load( 'assets/ground_plane_only2.glb', function ( gltf ) {

        const model = gltf.scene;
        const ground = model.children[0];
        model.position.set( 0, 0, -21.5 );
        fieldGroup.add( model );
        console.log(model)

        const vertexCount = model.children[0].geometry.getAttribute( 'position' ).count;
        let weight_unscaled = new Float32Array(vertexCount);
        let weight = new Float32Array(vertexCount);
        let xpos = new Array();
        let ypos = new Array();
        let zpos = new Array();
        for (let i=0; i<vertexCount*3; i++){
            if (i%3 == 0){
                xpos.push(model.children[0].geometry.attributes.position.array[i]);
            } else if (i%3 == 1){
                ypos.push(model.children[0].geometry.attributes.position.array[i]);
            } else {
                zpos.push(model.children[0].geometry.attributes.position.array[i]);
            }
        }
        let pointpos;
        for (let i=0; i<vertexCount; i++){
            pointpos = new THREE.Vector3(xpos[i] - camera.position.x, 0, zpos[i] - camera.position.z - 21.5);
            weight_unscaled[i] = pointpos.lengthSq();
        }
        let normalizer = Math.max.apply(null, weight_unscaled);
        for (let i=0; i<vertexCount; i++){
            weight[i] = weight_unscaled[i] / normalizer;
            weight[i] = 1 - weight[i];
            if (weight[i] < 0.7){
                weight[i] = 0;
            }
        }
        console.log(Math.max.apply(null, weight));
        console.log(Math.min.apply(null, weight));
        model.children[0].geometry.setAttribute( 'weight', new THREE.BufferAttribute( weight, 1 , true).setUsage( THREE.DynamicDrawUsage ) );

        const sampler = new MeshSurfaceSampler(model.children[0]).setWeightAttribute('weight').build();

        const tempPosition = new THREE.Vector3();
        const geometry = new THREE.PlaneGeometry( 0.5, 0.5, 1, 4 );
        geometry.translate( 0, 0.25, 0 );
    
        const instancedMesh = new THREE.InstancedMesh( geometry, leavesMaterial, instanceNumber );
    
        fieldGroup.add( instancedMesh );

        for ( let i=0 ; i<instanceNumber ; i++ ) {
            sampler.sample(tempPosition);
            dummy.position.x = tempPosition.x;
            dummy.position.y = tempPosition.y;
            dummy.position.z = tempPosition.z -21.5;
        
        dummy.scale.setScalar( 1 + Math.random() * 1.5 );
        
        // dummy.rotation.y = Math.random() * Math.PI;
        dummy.rotation.y = Math.PI;
        
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

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

    // gsap.to(camera.position, {
    //     x: selectedObject.position.x,
    //     y: selectedObject.position.y,
    //     z: selectedObject.position.z,
    //     duration: 3,
    //     onComplete: function (){
    //         // match new scene position with selected door position
    //         roomGroup.position.x = selectedObject.position.x
    //         roomGroup.position.z = selectedObject.position.z

    //         // small brain visible boolean and scene add / removal.
    //         roomGroup.visible = true;
    //         scene.add( roomGroup );

    //         fieldGroup.visible = false;
    //         scene.remove( fieldGroup );
    //     }
    // });
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