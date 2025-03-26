import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

class MiniViewer {
    constructor(mesh, viewer, container) {
        this.viewer = viewer
        this.miniViewerSceneObject = []
        this.miniViewerContainerDiv = container
        this.dimensionLines = []
        this.isMiniViewerEnabaled = true
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
        this.animate();
    }

    setupRenderer() {
        this.miniViewerRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.miniViewerRenderer.setSize(this.miniViewerContainer.clientWidth, this.miniViewerContainer.clientHeight);
        this.miniViewerContainer.appendChild(this.miniViewerRenderer.domElement);
    }

    setupScene() {
        this.miniViewerScene = new THREE.Scene();
        this.miniViewerScene.background = new THREE.Color(0xe5e5e5);
    }

    setupCamera() {
        this.miniViewerCamera = new THREE.PerspectiveCamera(75, this.miniViewerContainer.clientWidth / this.miniViewerContainer.clientHeight, 10, 10000);
        this.miniViewerCamera.position.set(0, 0, 175);
        this.miniViewerScene.add(this.miniViewerCamera);
    }
    setupLights() {
        this.miniViewerLights = new THREE.AmbientLight();
        this.miniViewerScene.add(this.miniViewerLights);
    }

    addBody(mesh) {
        mesh.visible = false
        const clonedRectangle = mesh.parent.clone();
        clonedRectangle.position.set(0, 0, 0); // Center in the mini viewer

        this.miniViewerScene.add(clonedRectangle);
        this.miniViewerSceneObject.push(clonedRectangle)
    }
    setupRayCaster() {
        this.raycaster = new THREE.Raycaster();
    }

    setupControls() {
        this.miniViewerOrbitControl = new OrbitControls(this.miniViewerCamera, this.miniViewerRenderer.domElement);
        this.miniViewerOrbitControl.enableDamping = true;
        this.miniViewerTransformControls = new TransformControls(this.miniViewerCamera, this.miniViewerRenderer.domElement);
        this.miniViewerTransformControls.setSpace('world');
        this.miniViewerTransformControls.size = 0.5;
        this.miniViewerTransformControls.showZ = false;
        this.miniViewerTransformControls.setTranslationSnap(null);
        this.miniViewerTransformControls.setMode('translate');
        this.miniViewerScene.add(this.miniViewerTransformControls);
    }
    setupEventListeners() {
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        this.miniViewerRenderer.domElement.addEventListener("click", (event) => this.handleClick(event).bind(this));
    }

    handleKeyDown(event) {
        switch (event.code) {
            case 'KeyG':
                this.miniViewerTransformControls.setMode('translate');
                break;
            case 'KeyR':
                this.miniViewerTransformControls.setMode('rotate');
                break;
            case 'KeyS':
                this.miniViewerTransformControls.setMode('scale');
                break;
        }
    }

    handleClick(event) {
        const rect = this.miniViewerRenderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.miniViewerCamera);
        const objectIntersects = this.raycaster.intersectObjects(this.miniViewerSceneObject, true);
        if (objectIntersects.length > 0) {
            this.handleObjectIntersection(objectIntersects[0].object);
        } else {
            this.resetTransformControls();
        }
    }

    handleObjectIntersection(intersectedObject) {
        this.intersectedObject = intersectedObject;
        this.miniViewerTransformControls.detach();
        this.miniViewerTransformControls.attach(this.intersectedObject);

        const gizmo = this.miniViewerTransformControls.getHelper();
        this.miniViewerScene.add(gizmo);
        this.miniViewerOrbitControl.enabled = false;
        this.miniViewerTransformControls.addEventListener('change', () => this.miniViewerTransformControls.update());
        this.miniViewerTransformControls.addEventListener('objectChange', () => {
            this.add3DDimensionsToRectangles(this.intersectedObject)
        });
         this.miniViewerTransformControls.addEventListener('mouseUp', () => {
            this.removeDimensions();
        }); 
    }

    resetTransformControls() {
        this.miniViewerTransformControls.detach();
        this.miniViewerOrbitControl.enabled = true;
    }

    add3DDimensionsToRectangles(mesh) {
        // Remove existing dimension lines and labels if they exist
        if (mesh.userData.dimensionLines) {
            mesh.userData.dimensionLines.forEach(line => this.miniViewerScene.remove(line));
        }
        if (mesh.userData.dimensionLabels) {
            mesh.userData.dimensionLabels.forEach(label => label.remove());
        }

        const { width, height } = mesh.geometry.parameters;
        const position = mesh.position.clone();
        const scale = mesh.scale.clone();

        // 3D Dimension Arrows
        const createDimensionArrows = (start, end) => {
            const direction = new THREE.Vector3().subVectors(end, start).normalize();
            const length = start.distanceTo(end);
            const arrowSize = 1; // Arrowhead length
            const arrowWidth = 3; // Arrowhead width

            // Create arrows at both ends
            const arrow1 = new THREE.ArrowHelper(direction, start, length, 0x000000, arrowSize, arrowWidth);
            const arrow2 = new THREE.ArrowHelper(direction.clone().negate(), end, length, 0x000000, arrowSize, arrowWidth);

            this.miniViewerScene.add(arrow1);
            this.miniViewerScene.add(arrow2);
            this.dimensionLines.push(arrow1, arrow2);

            return [arrow1, arrow2];
        };

        const halfWidth = (width * scale.x) / 2;
        const halfHeight = (height * scale.y) / 2;
        const offsetDistance = 5; // Adjust this value for spacing

        const topStart = new THREE.Vector3(position.x - halfWidth, position.y + halfHeight + offsetDistance, position.z);
        const topEnd = new THREE.Vector3(position.x + halfWidth, position.y + halfHeight + offsetDistance, position.z);

        const sideStart = new THREE.Vector3(position.x + halfWidth + offsetDistance, position.y - halfHeight, position.z);
        const sideEnd = new THREE.Vector3(position.x + halfWidth + offsetDistance, position.y + halfHeight, position.z);

        const topArrows = createDimensionArrows(topStart, topEnd);
        const sideArrows = createDimensionArrows(sideStart, sideEnd);

        mesh.userData.dimensionLines = [...topArrows, ...sideArrows];

        // 2D HTML Labels
        const createDimensionLabel = (text, position) => {
            const label = document.createElement('div');
            label.className = 'dimension-label';
            label.textContent = text;
            label.style.position = 'absolute';
            label.style.color = 'black';
            label.style.background = 'white';
            label.style.padding = '2px 5px';
            label.style.fontSize = '12px';
            document.body.appendChild(label);

            const updateLabelPosition = () => {
                const screenPosition = position.clone().project(this.miniViewerCamera);
                const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;
                label.style.left = `${x}px`;
                label.style.top = `${y}px`;
            };

            updateLabelPosition();
            return { element: label, updatePosition: updateLabelPosition };
        };

        const topLabel = createDimensionLabel(`${Math.round(width * scale.x)} mm`, new THREE.Vector3(position.x, position.y + halfHeight + 10, position.z));
        const sideLabel = createDimensionLabel(`${Math.round(height * scale.y)} mm`, new THREE.Vector3(position.x + halfWidth + 10, position.y, position.z));

        mesh.userData.dimensionLabels = [topLabel.element, sideLabel.element];

        // Ensure labels update with camera movement
        const updateLabels = () => {
            topLabel.updatePosition();
            sideLabel.updatePosition();
        };

        this.miniViewerTransformControls.addEventListener('change', updateLabels);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.miniViewerOrbitControl.update();
        this.miniViewerRenderer.render(this.miniViewerScene, this.miniViewerCamera);
    }
}

export { MiniViewer }
