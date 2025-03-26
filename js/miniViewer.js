import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Dimensions } from './dimensions.js';
class MiniViewer {
    constructor(mesh, viewer, container) {
        this.viewer = viewer
        this.miniViewerSceneObject = []
        this.miniViewerContainerDiv = container
        this.dimensionLines = []
        this.isMiniViewerEnabled = true
        this.widthO = 555;
        this.heightO = 717;
        this.activeAxis = null;
        this.initialMouse = new THREE.Vector2();
        this.deltaMouse = new THREE.Vector2();
        this.init(mesh);
    }

    init(mesh) {
        this.miniViewerContainer = document.getElementById("mini-container");
        this.setupRenderer();
        this.setupScene();
        this.setupLights()
        this.setupCamera()
        this.setupMesh(mesh)
        this.setupRayCaster()
        this.setupControls()
        this.setupEventListeners();
        this.setupDimension();
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.widthO, this.heightO);
        this.miniViewerContainer.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe5e5e5);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, this.widthO / this.heightO, 10, 10000);
        this.camera.position.set(0, 0, 150);
        this.scene.add(this.camera);
    }
    setupLights() {
        this.lights = new THREE.AmbientLight();
        this.scene.add(this.lights);
    }

    setupMesh(mesh) {
        mesh.visible = false
        const clonedRectangle = mesh.parent.clone();
        clonedRectangle.position.set(0, 0, 0); // Center in the mini viewer
        this.pivot = new THREE.Object3D();
        const pivotHelper = new THREE.Mesh(
            new THREE.SphereGeometry(10),
            new THREE.MeshBasicMaterial({ wireframe: false, color: 'red' })
        );
        this.pivot.add(pivotHelper)
        this.scene.add(clonedRectangle);
        this.scene.add(this.pivot);
        this.miniViewerSceneObject.push(clonedRectangle)
    }
    setupRayCaster() {
        this.raycaster = new THREE.Raycaster();
    }

    setupControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setSpace('world');
        this.transformControls.size = 0.5;
        this.transformControls.showZ = false;
        this.transformControls.setTranslationSnap(null);
        this.transformControls.setMode('translate');
        this.scene.add(this.transformControls);
    }

    setupDimension() {
        this.dimensions = new Dimensions(this);
    }
    setupEventListeners() {
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
        window.addEventListener('pointermove', (event) => this.handlePointerMove(event));
        this.renderer.domElement.addEventListener("click", (event) => this.handleClick(event));
    }

    handlePointerDown(event) {
        this.initialMouse.set(event.clientX, event.clientY);
    }

    handlePointerMove(event) {
        this.deltaMouse.set(event.clientX - this.initialMouse.x, event.clientY - this.initialMouse.y);
    }

    handleKeyDown(event) {
        switch (event.code) {
            case 'KeyG':
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

    handleClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);
        const objectIntersects = this.raycaster.intersectObjects(this.miniViewerSceneObject, true);
        if (objectIntersects.length > 0) {
            this.handleObjectIntersection(objectIntersects[0].object);
        } else {
            this.resetTransformControls();
        }
    }

    handleObjectIntersection(intersectedObject) {
        this.intersectedObject = intersectedObject;
        this.transformControls.detach();
        this.transformControls.attach(this.pivot);

        const gizmo = this.transformControls.getHelper();
        this.scene.add(gizmo);
        this.orbitControls.enabled = false;
        this.transformControls.addEventListener('change', () => {
            this.transformControls.update()
            this.scene.needsRender = true
        }

        );
        this.transformControls.addEventListener('objectChange', () => {
            if (this.transformControls.mode === 'scale') {
                console.log("Scaling Event Triggered");
                this.pivot.attach(this.intersectedObject);
                /*   if (this.intersectedObject.parent !== this.pivot) {
                      this.pivot.attach(this.intersectedObject);
                  } */

                /*  if (!this.initialPivotPosition) {
                     this.initialPivotPosition = this.pivot.position.clone();
                 }
         
                 const scaleHandle = this.transformControls.axis;
                 if (scaleHandle === 'Y') {
                     this.pivot.position.y = this.initialPivotPosition.y; // Maintain initial position
                 }
                 if (scaleHandle === 'X') {
                     this.pivot.position.x = this.initialPivotPosition.x; // Maintain initial position
                 } */

                this.scene.needsRender = true;
            }
        });
        this.transformControls.addEventListener('mouseUp', () => {
            this.dimensions.removeDimensions();
        });
        this.transformControls.addEventListener('mouseDown', (event) => {
            if (this.transformControls.mode === 'scale') {
                const box = new THREE.Box3().setFromObject(this.intersectedObject);
                this.pivot.position.copy(this.intersectedObject.position)
                const scaleHandle = this.transformControls.axis;
                if (scaleHandle === 'Y') {
                    if (this.deltaMouse.x < 0) {
                        console.log("Top Fixed - Scaling Downwards");
                        this.pivot.position.y = box.min.y; 
                    } else {
                        console.log("Bottom Fixed - Scaling Upwards");
                        this.pivot.position.y = box.max.y; 
                    }
                }

                if (scaleHandle === 'X') {
                    if (this.deltaMouse.x > 0) {
                        console.log("Right Fixed - Scaling Left");
                        this.pivot.position.x = box.min.x; 
                    } else {
                        console.log("Left Fixed - Scaling Right");
                        this.pivot.position.x = box.max.x; 
                    }
                }
                this.orbitControls.enabled = false
                this.transformControls.attach(this.pivot);
            }
        });

    }

    resetTransformControls() {
        this.transformControls.detach();
        this.orbitControls.enabled = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export { MiniViewer }
