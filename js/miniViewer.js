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
        this.widthO = 890;
        this.heightO = 729;
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
        this.setupPlane();
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.setSize(this.widthO, this.heightO);
        this.miniViewerContainer.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("white");
        this.scene.fog = new THREE.Fog("white", 500, 2000);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, this.widthO / this.heightO, 10, 10000);
        this.camera.position.set(0, 0, 150);
        this.scene.add(this.camera);
    }
    setupLights() {
        this.lights = new THREE.AmbientLight();
        this.scene.add(this.lights);

        const pointLight = new THREE.PointLight("white", 5, 0, 0.1);
        pointLight.position.set(100, 100, 300);
        pointLight.castShadow = true;
        this.scene.add(pointLight);
    }

    setupMesh(mesh) {
        this.viewer.bodies.hideAllSprites()
        const clonedRectangle = mesh.parent.clone();
        clonedRectangle.position.set(0, 0, 0); // Center in the mini viewer
        this.pivot = new THREE.Object3D();
        this.scene.add(clonedRectangle);
        this.scene.add(this.pivot);
        this.miniViewerSceneObject.push(clonedRectangle)
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
        const boundingBox = new THREE.Box3().setFromObject(this.viewer.bodies.frame);
        const minY = boundingBox.min.y - 5; // Slight offset to keep it below
        this.plane.position.y = minY;
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

        this.transformControls.addEventListener('objectChange', () => {
            if (this.transformControls.mode === 'scale') {
                this.dimensions.add3DDimensionsToRectangles(this.intersectedObject)
            }
        });

        this.transformControls.addEventListener('mouseUp', () => {
            if (this.transformControls.mode === 'scale') {
                if (this.intersectedObject && this.intersectedObject.parent === this.pivot) {
                    this.pivot.remove(this.intersectedObject);
                    const originalScale = this.intersectedObject.scale.clone();
                    const newScale = new THREE.Vector3(
                        this.pivot.scale.x !== 1 ? originalScale.x + this.pivot.scale.x : originalScale.x,
                        this.pivot.scale.y !== 1 ? originalScale.y + this.pivot.scale.y : originalScale.y,
                        this.pivot.scale.z !== 1 ? originalScale.z + this.pivot.scale.z : originalScale.z
                    );
                    this.viewer.popup.selectedRectangle.parent.scale.copy(newScale);
                    this.intersectedObject.applyMatrix4(this.pivot.matrixWorld);
                    //need to work yash find generic logic
                    this.pivot.position.set(0, 0, 0);
                    this.pivot.scale.set(1, 1, 1);
                    this.pivot.rotation.set(0, 0, 0);
                    this.scene.add(this.intersectedObject);
                }

                this.transformControls.detach();
                this.dimensions.removeDimensions();
            }
        });
        this.transformControls.addEventListener('mouseDown', (event) => {
            if (this.transformControls.mode === 'scale') {

                const box = new THREE.Box3().setFromObject(this.intersectedObject);
                this.pivot.position.copy(this.intersectedObject.position)
                const scaleHandle = this.transformControls.axis;
                if (scaleHandle === 'Y') {
                    this.pivot.position.y = this.deltaMouse.y < 0 ? box.min.y : box.max.y;
                }
                if (scaleHandle === 'X') {
                    this.pivot.position.x = this.deltaMouse.x > 0 ? box.min.x : box.max.x;
                }
                this.orbitControls.enabled = false
                this.pivot.attach(this.intersectedObject);
                this.transformControls.attach(this.pivot);
            } else {
                this.transformControls.attach(this.intersectedObject);
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
