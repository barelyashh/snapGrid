import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Popup } from './popup.js';
import { Bodies } from './bodies.js';
import { UserInterface } from './userInterface.js';

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
        this.controls = null;
        this.container = null;
        this.scene = null;
        this.lights = null;
        this.renderer = null;
        this.mouse = null;
        this.raycaster = null;
        this.widthO = 1115;
        this.heightO = 830;
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
    }

    createViewer() {
        this.container = document.getElementById('three-container') || document.createElement('div');
        document.body.appendChild(this.container);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setSize(this.widthO, this.heightO);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe5e5e5);

        this.camera = new THREE.PerspectiveCamera(75, this.widthO / this.heightO, 10, 10000);
        this.scene.add(this.camera);
        this.lights = new THREE.AmbientLight();
        this.scene.add(this.lights);

        this.raycaster = new THREE.Raycaster();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setSpace('world');
        this.transformControls.size = 0.5;
        this.transformControls.showZ = false
        this.transformControls.setTranslationSnap(null);
        this.scene.add(this.transformControls);
        this.transformControls.setMode('translate')

        this.scene.background = new THREE.Color("white");
        this.scene.fog = new THREE.Fog("white", 500, 2000);

        const pointLight = new THREE.PointLight("white", 5, 0, 0.1);
        pointLight.position.set(100, 100, 300);
        pointLight.castShadow = true;
        pointLight.shadowIntensity = 1;
        this.scene.add(pointLight);

        const planeWidth = 100000;
        const planeHeight = 100000;

        const PlaneGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const PlaneMaterial = new THREE.MeshPhysicalMaterial({
            color: "#edb568",
            roughness: 0.8,
        });


        this.plane = new THREE.Mesh(PlaneGeometry, PlaneMaterial);
        this.plane.receiveShadow = true;
        this.plane.position.y = -100;
        this.plane.rotation.x = -Math.PI / 2;
        this.scene.add(this.plane);

        this.bodies = new Bodies(this)
        window.addEventListener('keydown', (event) => {
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
        });
        window.addEventListener('resize', this.onWindowResize, false);
        this.renderer.setSize(this.widthO, this.heightO);
        this.renderer.domElement.addEventListener("click", (event) => {
            if (this.bodies.overallBodies.length > 0 || this.bodies.twoDObjects.length > 0) this.handleClick(event);
        });
        this.renderer.domElement.addEventListener("mouseover", (event) => {
            this.bodies.addDragControls(event)
        });

    }
    switchMode() {

        this.mode2D = !this.mode2D;
        const scene = this.scene;
        const camera = this.camera;
        const controls = this.controls;
        const gridHelperName = 'gridHelper';
        const lineSegmentsName = 'lineSegments';


        if (this.mode2D) {
            if(this.plane){
                this.scene.remove(this.plane)
            }
            controls.reset();
            if (this.transformControls) {
                this.scene.remove(this.transformControls);
                this.transformControls.detach();
            }

            const objectMaxSize = Math.max(this.bodies.frame.geometry.parameters.width, this.bodies.frame.geometry.parameters.height)
            const size = objectMaxSize + 300;
            const divisions = 10;
            let gridHelper = scene.getObjectByName(gridHelperName);


            if (!gridHelper) {
                gridHelper = new THREE.GridHelper(size, divisions);
                gridHelper.name = gridHelperName;
                scene.add(gridHelper);
            }

            camera.position.set(0, objectMaxSize, 0);
            camera.lookAt(0, 0, 0);
            controls.enabled = true;
            controls.enableRotate = false;


            this.scene.remove(this.bodies.frame);
            this.bodies.overallBodies.forEach((mesh) => {
                this.scene.remove(mesh)
            })
            this.bodies.generate2DDrawing()

        } else {
            this.scene.add(this.plane)
            const gridHelper = scene.getObjectByName(gridHelperName);
            const lineSegments = scene.getObjectByName(lineSegmentsName);

            if (gridHelper) scene.remove(gridHelper);
            if (lineSegments) scene.remove(lineSegments);
            this.bodies.twoDObjects.forEach((mesh) => {
                if (mesh.name.includes('segments')) {
                    this.scene.remove(mesh)
                }
            })

            controls.reset();
            controls.enableRotate = true;
            this.scene.add(this.transformControls);

            camera.position.set(this.position.x, this.position.y, this.position.z);
            camera.lookAt(this.target.x, this.target.y, this.target.z);
            scene.add(this.bodies.frame);
            this.bodies.overallBodies.forEach((mesh) => {
                const lineData = mesh.userData.line;
                if (lineData) {
                    const { position, scale, rotation } = lineData;
                    mesh.position.set(position.x, -position.z, mesh.position.z);
                    mesh.scale.copy(scale);
                    mesh.rotation.z = -rotation.z;
                }
                scene.add(mesh);
            });
            this.bodies.twoDObjects = [];
        }
    }

    handleClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);

        // Handle sprite clicks
        const spriteIntersects = this.raycaster.intersectObjects(this.bodies.spriteObjects, true);
        if (spriteIntersects.length > 0 && this.bodies.spriteObjects.includes(spriteIntersects[0].object)) {
            this.popup = new Popup(spriteIntersects[0].object, this.onSave.bind(this));
            return;
        }
        if (this.mode2D) {
            return
        }

        if (this.bodies.transformEnabled) {
            const objectsToCheck = this.mode2D ? this.bodies.twoDObjects : this.bodies.overallBodies;
            const objectIntersects = this.raycaster.intersectObjects(objectsToCheck, true);

            if (objectIntersects.length > 0) {
                this.handleObjectIntersection(objectIntersects[0].object);


            } else {
                this.resetTransformControls();
            }
        }
    }

    handleObjectIntersection(intersectedObject) {

        this.intersectedObject = intersectedObject;
        this.transformControls.detach();
        this.transformControls.attach(this.intersectedObject);

        const gizmo = this.transformControls.getHelper();
        this.scene.add(gizmo);
        this.controls.enabled = this.mode2D;

        this.transformControls.addEventListener('change', () => this.transformControls.update());
        this.transformControls.addEventListener('objectChange', () => {
            this.restrictDoorMovement(this.intersectedObject, this.mode2D);
        });
    }

    resetTransformControls() {
        this.transformControls.detach();
        this.controls.enabled = true;
    }

    restrictDoorMovement(intersectedObject, mode2D) {
        const modelBoundingBox = new THREE.Box3().setFromObject(intersectedObject);
        const restrictPosition = (position, halfDimension, rectangleHalf) => {
            return THREE.MathUtils.clamp(position, halfDimension, rectangleHalf);
        };
        if (!this.overallDimensionValues) return;
        const overallDepthHalf = this.overallDimensionValues.depth / 2;
        const boundaryBoundingBox = new THREE.Box3().setFromObject(this.bodies.frame);

        if (boundaryBoundingBox.max.x < modelBoundingBox.max.x || boundaryBoundingBox.min.x > modelBoundingBox.min.x || boundaryBoundingBox.min.y > modelBoundingBox.min.y || boundaryBoundingBox.max.y < modelBoundingBox.max.y) {
            intersectedObject.position.x = restrictPosition(intersectedObject.position.x, boundaryBoundingBox.min.x + (modelBoundingBox.getSize(new THREE.Vector3()).x / 2), boundaryBoundingBox.max.x - (modelBoundingBox.getSize(new THREE.Vector3()).x / 2));
            intersectedObject.position.y = restrictPosition(intersectedObject.position.y, boundaryBoundingBox.min.y + (modelBoundingBox.getSize(new THREE.Vector3()).y / 2), boundaryBoundingBox.max.y - (modelBoundingBox.getSize(new THREE.Vector3()).y / 2));
            intersectedObject.position.z = overallDepthHalf;
            return
        }
    }

    switchSnap() {
        if (this.snapEnabled) {
            this.bodies.removeSnapPoints(this.mode2D);
            this.snapEnabled = false;
            return;
        }
        if (this.mode2D) {
            this.snapEnabled = true;
            this.bodies.addSnapPointsTo2Drectangles();
        } else {
            this.snapEnabled = true;
            this.bodies.addSnapPointsTo3DRectangles();
        }
    }

    onSave() {
        this.bodies.hideAllSprites()
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.bodies.spriteObjects.forEach(obj => {
            obj.quaternion.copy(this.camera.quaternion);
        });

        this.render();
        this.controls.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

export { completeViewer, create };
