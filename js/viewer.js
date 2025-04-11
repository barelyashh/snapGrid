import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Popup } from './popup.js';
import { Bodies } from './bodies.js';
import { UserInterface } from './userInterface.js';
import { Dimensions } from './dimensions.js';
import { scaleModel } from './operations/scalingHelper.js';

let completeViewer = null;

function create() {
    completeViewer = new Viewer();
    completeViewer.ui = new UserInterface(completeViewer)
    completeViewer.createViewer();
    completeViewer.animate();
}
class Viewer {
    constructor() {
        this.camera = null;
        this.orbitControls = null;
        this.container = null;
        this.scene = null;
        this.lights = null;
        this.renderer = null;
        this.mouse = null;
        this.raycaster = null;
        this.widthO = 1600;
        this.heightO = 900;
        this.raycasterObject = [];
        this.overallWidth = null;
        this.overallHeight = null;
        this.overallDepth = null;
        this.overallDimensionValues = {};
        this.bodies = null
        this.mode2D = false
        this.position = new THREE.Vector3(0, 0, 0)
        this.target = new THREE.Vector3(0, 1, 0);
        this.plane = null;
        this.objectMaxSize = 0
        this.dimensions = null
        this.activeAxis = null;
        this.initialMouse = new THREE.Vector2();
        this.deltaMouse = new THREE.Vector2();
        this.size = 0
        this.rect = null
        this.temporaryScale = new THREE.Vector3(1,1,1)
        this.minBox = new THREE.Vector3(0,0,0)
        this.maxBox = new THREE.Vector3(0,0,0)
        this.lastMouseX = 0;
        this.offsetX = 1
        this.offsetY = 1
        this.offsetZ =1
        this.previousScale =new THREE.Vector3(1,1,1)
        this.scalingDampeningFactor =1;
    }

    createViewer() {
        this.setupContainer();
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupControls();
        this.setupRayCaster();
        this.setupBodies();
        this.setupDimension();
        this.setupEventListeners();
    }

    setupContainer() {
        this.container = document.getElementById('three-container') || document.createElement('div');
        document.body.appendChild(this.container);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.setSize(this.widthO, this.heightO);
        this.container.appendChild(this.renderer.domElement);
        this.rect = this.renderer.domElement.getBoundingClientRect();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("white");
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, this.widthO / this.heightO, 10, 10000);
        this.scene.add(this.camera);
    }

    setupLights(x, z, depth) {
        this.lights = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(this.lights);

        const spotLight = new THREE.SpotLight(0xffffff, 3);
        spotLight.position.set(x, z / 2, z);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        spotLight.angle = Math.PI / 2;
        spotLight.penumbra = 1;
        spotLight.decay = 0;
        spotLight.shadow.focus = 1;
        spotLight.shadow.camera.near = 1;
        spotLight.shadow.camera.far = z + depth;
        spotLight.shadow.camera.fov = 75;
        spotLight.distance = z + depth;

        this.scene.add(spotLight);
    }

    setupControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setSpace('world');
        this.transformControls.size = 0.5;
        //this.transformControls.showZ = false;
        this.transformControls.setTranslationSnap(null);
        this.transformControls.setMode('translate');
        this.scene.add(this.transformControls);
    }

    setupRayCaster() {
        this.raycaster = new THREE.Raycaster();
    }

    setupPlane() {
        const planeWidth = 100000;
        const planeHeight = 100000;
        const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: "#ffffff",
        });

        this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.plane.receiveShadow = true;
        this.plane.position.y = -100;
        this.plane.rotation.x = -Math.PI / 2;
        this.scene.add(this.plane);
        this.updatePlanePosition()
    }

    updatePlanePosition() {
        const boundingBox = new THREE.Box3().setFromObject(this.bodies.frame);
        const minY = boundingBox.min.y - 5; // Slight offset to keep it below
        this.plane.position.y = minY;
    }

    setupBodies() {
        this.bodies = new Bodies(this);
    }

    setupDimension() {
        this.dimensions = new Dimensions(this);
    }

    setupEventListeners() {
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('resize', () => this.onWindowResize(), false);
        window.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
        window.addEventListener('pointermove', (event) => this.handlePointerMove(event));
        this.renderer.domElement.addEventListener("click", (event) => this.handleClickIfNeeded(event));
    }

    handlePointerDown(event) {
        this.initialMouse.set(event.clientX, event.clientY);
    }

    handlePointerMove(event) {
        this.deltaMouse.set( ((event.clientX - this.rect.left) / this.rect.width) * 2 - 1,
        -((event.clientY - this.rect.top) / this.rect.height) * 2 + 1);
    }

    handleKeyDown(event) {
        switch (event.code) {
            case 'KeyT':
                this.transformControls.setMode('translate');
                break;
            case 'KeyR':
                this.transformControls.setMode('rotate');
                break;
            case 'KeyS':
                this.transformControls.setMode('scale');
                break;
        }
    }

    handleClickIfNeeded(event) {
        if (this.bodies.overallBodies.length > 0 || this.bodies.twoDObjects.length > 0) {
            this.handleClick(event);
        }
    }

    onWindowResize = () => {
        this.camera.aspect = this.widthO / this.heightO;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.widthO, this.heightO);
    };

    switchMode() {
        this.mode2D = !this.mode2D;

        if (this.mode2D) {
            this.enable2DMode();
        } else {
            this.enable3DMode();
        }
    }

    enable2DMode() {
        const { width, height, depth } = this.bodies.frame.geometry.parameters
        if (this.plane) {
            this.scene.remove(this.plane);
        }

        this.orbitControls.reset();
        if (this.transformControls) {
            this.scene.remove(this.transformControls);
            this.transformControls.detach();
        }

        this.objectMaxSize = Math.max(width, height);

        this.size = this.objectMaxSize * Math.trunc(this.objectMaxSize / 20);
        let gridHelper = this.scene.getObjectByName('gridHelper');

        if (!gridHelper) {
            const data = Math.trunc(this.size / 60)
            gridHelper = new THREE.GridHelper(this.size, data);
            gridHelper.name = 'gridHelper';
            this.bodies.addCornerPoints(this.bodies.frame, data)
            const ratio = this.size / data
            this.bodies.gridPercentage = (ratio * 5) / 100
            this.scene.add(gridHelper);
        }

        this.camera.position.set(0, this.position.z - (depth / 2), 0);
        this.camera.lookAt(0, 0, 0);
        this.orbitControls.maxDistance = this.objectMaxSize + 300
        this.orbitControls.enabled = true;
        this.orbitControls.enableRotate = false;

        this.scene.remove(this.bodies.frame);
        this.bodies.overallBodies.forEach(child => this.scene.remove(child.mesh));
        this.bodies.generate2DDrawing();

        this.renderer.domElement.addEventListener("mouseenter", (event) => this.bodies.addDragControls(event));
    }

    enable3DMode() {
        this.scene.add(this.plane);
        this.bodies.points = []
        const gridHelper = this.scene.getObjectByName('gridHelper');
        const lineSegments = this.scene.getObjectByName('lineSegments');

        if (gridHelper) this.scene.remove(gridHelper);
        if (lineSegments) this.scene.remove(lineSegments);
        this.bodies.twoDObjects.forEach(mesh => {
            if (mesh.name.includes('segments')) {
                this.scene.remove(mesh);
            }
        });

        this.orbitControls.reset();
        this.orbitControls.enableRotate = true;
        this.scene.add(this.transformControls);

        this.camera.position.set(this.position.x, this.position.y, this.position.z);
        this.camera.lookAt(this.target.x, this.target.y, this.target.z);
        this.scene.add(this.bodies.frame);
        this.updateOverAllBodies();

        this.bodies.twoDObjects = [];
        this.bodies.innerObjects = []

        this.renderer.domElement.removeEventListener("mouseenter", (event) => this.bodies.addDragControls(event));
    }

    //removes circular dependecy of userdata
    updateOverAllBodies() {
        this.bodies.overallBodies.forEach(child => {
            const lineData = child.line.lineSegments;
            if (lineData) {
                const { position, scale, rotation } = lineData;
                child.mesh.position.set(position.x, -position.z, child.mesh.position.z);
                child.mesh.scale.copy(scale);
                child.mesh.rotation.z = -rotation.z;
            }
            this.scene.add(child.mesh);
        });
    }


    handleClick(event) {

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);
        if (!this.bodies.transformEnabled) {
            const spriteIntersects = this.raycaster.intersectObjects(this.bodies.spriteObjects, true);
            if (spriteIntersects[0] && spriteIntersects[0].object) {
                const intersectedSprite = spriteIntersects[0].object;
                if (spriteIntersects.length > 0 && this.bodies.spriteObjects.includes(intersectedSprite)) {
                    this.bodies.overallBodies.forEach((object) => {
                        {
                            if (object.sprite === spriteIntersects[0].object && object.sprite.visible) {
                                this.popup = new Popup(intersectedSprite, object.mesh, this, this.onSave.bind(this), this.onCancel.bind(this));
                                return;
                            }

                        }
                    })

                }
            }


        }

        if (this.mode2D) return;

        if (this.bodies.transformEnabled) {
            this.cleanupOutline();//yash need to wrok
            const objectsToCheck = this.bodies.overallBodies;
            const items = []
            objectsToCheck.forEach((item) => {
                items.push(item.mesh)
            });
            const objectIntersects = this.raycaster.intersectObjects(items, true);

            if (objectIntersects.length > 0) {

                this.handleObjectIntersection(objectIntersects[0].object);
            } else {
                this.resetTransformControls();
            }
        }
    }

    handleObjectIntersection(intersectedObject) {
        this.intersectedObject = intersectedObject;
        this.highlightSelectedObject(intersectedObject);

        // Attach Transform Controls
        this.transformControls.detach();
        this.transformControls.attach(this.intersectedObject);

        // Add Gizmo Helper
        const gizmo = this.transformControls.getHelper();
        this.scene.add(gizmo);

        // Ensure event listeners are properly set up
        this.setupTransformEvents();
    }

    setupTransformEvents() {
        this.transformControls.addEventListener("dragging-changed", (event) => {
            this.orbitControls.enabled = !event.value;
        });

        this.transformControls.addEventListener("objectChange", (e) => {
            if (this.transformControls.mode === "scale") {
                if(this.checkLimitaionScaling()) {
                    this.temporaryScale.set(this.intersectedObject.scale.x,this.intersectedObject.scale.y,this.intersectedObject.scale.z)
                } else{
                    this.intersectedObject.scale.set(this.temporaryScale.x,this.temporaryScale.y,this.temporaryScale.z)
                }
                const frame = this.bodies.frame
                scaleModel(this,frame)
                this.dimensions.add3DDimensionsToRectangles(this.intersectedObject);
            }
            this.restrictDoorMovement(this.intersectedObject);
        });

        this.transformControls.addEventListener("mouseDown", () => this.handleMouseDown());
        this.transformControls.addEventListener("mouseUp", () => this.handleMouseUp());
    }
    checkLimitaionScaling() {
        const boundaryBoundingBox = new THREE.Box3().setFromObject(this.bodies.frame);
        const modelBoundingBox = new THREE.Box3().setFromObject(this.intersectedObject);
        if (boundaryBoundingBox.containsBox(modelBoundingBox)) {
            return true
        } else {
            return false
        }
    }

    handleMouseDown() {
        if (this.transformControls.mode === "scale") {
            const modelBox = new THREE.Box3().setFromObject(this.intersectedObject);
            const frameBox = new THREE.Box3().setFromObject(this.bodies.frame);

          
            const bigSize = new THREE.Vector3();
            const smallSize = new THREE.Vector3();

            frameBox.getSize(bigSize);
            modelBox.getSize(smallSize);
          
            this.minBox.copy(modelBox.min);
            this.maxBox.copy(modelBox.max);

            // Track mouse direction only once
            if (!this._mouseMoveHandler) {
                this.lastMouseX = 0; 
                this._mouseMoveHandler = (event) => {
                    const mouseX = event.clientX;
                    this.lastMouseX = mouseX;
                };
                window.addEventListener('mousemove', this._mouseMoveHandler);
            }

           
            modelBox.getSize(smallSize);
        } else {
            this.transformControls.attach(this.intersectedObject);
        }
    }

    handleMouseUp() {
        this.cleanupOutline()
        if (this.transformControls.mode === "scale") {
            this.bodies.transformEnabled = true
            this.transformControls.detach();
            this.dimensions.removeDimensions();
        }
    }

    resetPivot() {
        this.bodies.pivot.position.set(0, 0, 0);
        this.bodies.pivot.scale.set(1, 1, 1);
        this.bodies.pivot.rotation.set(0, 0, 0);
    }



    cleanupOutline() {
        if (this.selectedOutline) {
            this.selectedOutline.geometry.dispose();
            this.selectedOutline.material.dispose();
            if (this.intersectedObject) {
                this.intersectedObject.remove(this.selectedOutline);
            }
            this.selectedOutline = null;
        }
    }


    highlightSelectedObject(intersectedObject) {
        if (this.selectedOutline) {
            intersectedObject.children = []
            this.scene.remove(this.selectedOutline);
            this.selectedOutline.geometry.dispose();
            this.selectedOutline.material.dispose();
            this.selectedOutline = null;
        }

        if (!intersectedObject) return;

        // Create a wireframe edges geometry
        const edgesGeometry = new THREE.EdgesGeometry(intersectedObject.geometry);
        /* const outlineMaterial = new THREE.LineBasicMaterial({
            color: 0xffff00, // Yellow
            linewidth: 3, // Line thickness (might not work in all browsers)
        }); */
        const outlineMaterial = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: new THREE.Color(0xffff00) }, // Bright yellow
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                uniform vec3 glowColor;
                void main() {
                    float intensity = pow(1.2 - dot(vNormal, vec3(0, 0, 1)), 2.0);
                    gl_FragColor = vec4(glowColor * intensity, 1.0);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });

        this.selectedOutline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
        intersectedObject.add(this.selectedOutline)
    }


    resetTransformControls() {
        this.transformControls.detach();
        this.orbitControls.enabled = true;
    }

    restrictDoorMovement(intersectedObject) {
        if (!this.overallDimensionValues) return;
        const modelBoundingBox = new THREE.Box3().setFromObject(intersectedObject);
        const boundaryBoundingBox = new THREE.Box3().setFromObject(this.bodies.frame);

        const restrictPosition = (position, halfDimension, rectangleHalf) => {
            return THREE.MathUtils.clamp(position, halfDimension, rectangleHalf);
        };

// console.log( "movement", boundaryBoundingBox.max.x <= modelBoundingBox.max.x )
        if (
            boundaryBoundingBox.max.x < modelBoundingBox.max.x ||
            boundaryBoundingBox.min.x > modelBoundingBox.min.x ||
            boundaryBoundingBox.min.y > modelBoundingBox.min.y ||
            boundaryBoundingBox.max.y < modelBoundingBox.max.y ||
            boundaryBoundingBox.max.z < modelBoundingBox.max.z ||
            boundaryBoundingBox.min.z > modelBoundingBox.min.z

        ) {
            intersectedObject.position.x = restrictPosition(
                intersectedObject.position.x,
                boundaryBoundingBox.min.x + (modelBoundingBox.getSize(new THREE.Vector3()).x / 2),
                boundaryBoundingBox.max.x - (modelBoundingBox.getSize(new THREE.Vector3()).x / 2)
            );
            intersectedObject.position.y = restrictPosition(
                intersectedObject.position.y,
                boundaryBoundingBox.min.y + modelBoundingBox.getSize(new THREE.Vector3()).y / 2,
                boundaryBoundingBox.max.y - modelBoundingBox.getSize(new THREE.Vector3()).y / 2
            );
            intersectedObject.position.z = restrictPosition(
                intersectedObject.position.z,
                boundaryBoundingBox.min.z + modelBoundingBox.getSize(new THREE.Vector3()).z / 2,
                boundaryBoundingBox.max.z - modelBoundingBox.getSize(new THREE.Vector3()).z / 2
            );
        }

    }

    onSave() {
        this.bodies.showAllSprites()
    }

    onCancel() {
        this.bodies.showAllSprites()
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.bodies.spriteObjects.forEach(obj => {
            obj.quaternion.copy(this.camera.quaternion);
        });
        this.render();
        if (!this.mode2D) this.orbitControls.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

export { completeViewer, create };
