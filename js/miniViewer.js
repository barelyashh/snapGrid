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
        this.init(mesh);
    }

    init(mesh) {
        this.miniViewerContainer = document.getElementById("mini-container");
        this.setupRenderer();
        this.setupScene();
        this.setupLights()
        this.setupCamera()
        this.addBody(mesh)
        this.setupRayCaster()
        this.setupControls()
        this.setupEventListeners();
        this.setupDimension();
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.miniViewerContainer.clientWidth, this.miniViewerContainer.clientHeight);
        this.miniViewerContainer.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe5e5e5);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, this.miniViewerContainer.clientWidth / this.miniViewerContainer.clientHeight, 10, 10000);
        this.camera.position.set(0, 0, 175);
        this.scene.add(this.camera);
    }
    setupLights() {
        this.lights = new THREE.AmbientLight();
        this.scene.add(this.lights);
    }

    addBody(mesh) {
        mesh.visible = false
        const clonedRectangle = mesh.parent.clone();
        clonedRectangle.position.set(0, 0, 0); // Center in the mini viewer

        this.scene.add(clonedRectangle);
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
        this.renderer.domElement.addEventListener("click", (event) => this.handleClick(event));
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
        this.transformControls.attach(this.intersectedObject);

        const gizmo = this.transformControls.getHelper();
        this.scene.add(gizmo);
        this.orbitControls.enabled = false;
        this.transformControls.addEventListener('change', () => this.transformControls.update());
        this.transformControls.addEventListener('objectChange', () => {
            this.dimensions.add3DDimensionsToRectangles(this.intersectedObject)
        });
         this.transformControls.addEventListener('mouseUp', () => {
            this.dimensions.removeDimensions();
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
