import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Dimensions } from './dimensions.js';
import { API } from './api.js';

class MiniViewer {
    constructor(parent, viewer, container) {
        this.viewer = viewer
        this.miniViewerSceneObject = []
        this.miniViewerContainerDiv = container
        this.dimensionLines = []
        this.isMiniViewerEnabled = true
        this.widthO = 890;
        this.heightO = 710;
        this.activeAxis = null;
        this.initialMouse = new THREE.Vector2();
        this.deltaMouse = new THREE.Vector2();
        this.init(parent);

    }

    init(parent) {
        this.miniViewerContainer = document.getElementById("mini-container");
        this.setupRenderer();
        this.setupScene();
        this.setupLights(parent)
        this.setupCamera(parent)
        this.setupMesh(parent)
        this.setupRayCaster()
        this.setupControls()
        this.setupEventListeners();
        this.setupDimension();
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
    }

    setupCamera(parent) {
        let cameraPosition = 0;

        parent.forEach(mesh => {
            const height = mesh.geometry.parameters.height;
            const width = mesh.geometry.parameters.width;
            cameraPosition = Math.max(height, width);
        });

        this.camera = new THREE.PerspectiveCamera(75, this.widthO / this.heightO, 0.1, 10000);
        this.camera.position.set(0, 0, cameraPosition);
        this.scene.add(this.camera);
    }

    setupLights(objects) {
        // Remove previous lights if needed
        if (this.lights) {
            this.scene.remove(this.lights);
        }

        // Ambient Light
        this.lights = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(this.lights);

        // Compute bounding box for all objects
        const combinedBox = new THREE.Box3();
        objects.forEach(obj => {
            obj.updateMatrixWorld();
            combinedBox.expandByObject(obj);
        });

        const frameSize = new THREE.Vector3();
        combinedBox.getSize(frameSize);

        const frameCenter = new THREE.Vector3();
        combinedBox.getCenter(frameCenter);

        const distance = Math.max(frameSize.x, frameSize.z) * 20;

        const sideDirs = [
            new THREE.Vector3(1, 0, 0),   // Right
            new THREE.Vector3(-1, 0, 0),  // Left
            new THREE.Vector3(0, 0, 1),   // Front
            new THREE.Vector3(0, 0, -1)   // Back
        ];

        // Side Lights
        sideDirs.forEach(dir => {
            const spotLight = new THREE.SpotLight(0xffffff, 2);
            const lightPos = frameCenter.clone().add(dir.clone().multiplyScalar(distance));
            lightPos.y = frameCenter.y; // Middle height

            spotLight.position.copy(lightPos);
            spotLight.target.position.copy(frameCenter);
            this.scene.add(spotLight.target);

            spotLight.castShadow = true;
            spotLight.shadow.mapSize.width = 1024;
            spotLight.shadow.mapSize.height = 1024;
            spotLight.angle = Math.PI / 4;
            spotLight.penumbra = 0.5;
            spotLight.decay = 0;
            spotLight.shadow.focus = 1;
            spotLight.shadow.camera.near = 1;
            spotLight.shadow.camera.far = frameSize.length();
            spotLight.shadow.camera.fov = 75;
            spotLight.distance = distance * 1.5;

            this.scene.add(spotLight);
        });

        // Top Light
        const topLight = new THREE.SpotLight(0xffffff, 2.5);
        const topPos = frameCenter.clone();
        topPos.y += frameSize.y * 1.5;

        topLight.position.copy(topPos);
        topLight.target.position.copy(frameCenter);
        this.scene.add(topLight.target);

        topLight.castShadow = true;
        topLight.shadow.mapSize.width = 1024;
        topLight.shadow.mapSize.height = 1024;
        topLight.angle = Math.PI / 4;
        topLight.penumbra = 0.5;
        topLight.decay = 0;
        topLight.shadow.focus = 1;
        topLight.shadow.camera.near = 1;
        topLight.shadow.camera.far = frameSize.length();
        topLight.shadow.camera.fov = 75;
        topLight.distance = frameSize.length() * 2;

        this.scene.add(topLight);

    }

    setupMesh(parent) {

        this.pivot = new THREE.Object3D();
        parent.length > 1
            ? parent.forEach(mesh => {
                const clonedRectangle = mesh.clone();
                // clonedRectangle.position.set(0, 0, 0); // Center in the mini viewer
                this.scene.add(clonedRectangle);
                this.miniViewerSceneObject.push(clonedRectangle);
            })
            : parent.forEach(mesh => {
                const clonedRectangle = mesh.clone();
                clonedRectangle.position.set(0, 0, 0); // Center in the mini viewer
                this.scene.add(clonedRectangle);
                this.miniViewerSceneObject.push(clonedRectangle);
            })

        this.scene.add(this.pivot);
    }

    applyTextureToMesh(textureDataUrl, targetMesh) {
        if (!textureDataUrl || !targetMesh) return;
                // const textureDataURL1 = 'https://imagedelivery.net/6Q4HLLMjcXxpmSYfQ3vMaw/d419666c-f723-4320-29d7-04f2f687c200/2000px'
        const textureLoader = new THREE.TextureLoader();
        return new Promise((resolve, reject) => {
            textureLoader.load(
                textureDataUrl,
                (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;

                    // Calculate the size of the mesh
                    const boundingBox = new THREE.Box3().setFromObject(targetMesh);
                    const size = new THREE.Vector3();
                    boundingBox.getSize(size);

                    // Apply repeat value based on mesh size
                    const repeatValue = 1 / Math.max(size.x, size.y); // Adjust as needed
                    texture.repeat.set(repeatValue, repeatValue);
                    
                    if (targetMesh.material) {
                        const newMat = new THREE.MeshBasicMaterial({ map: texture });
                        targetMesh.material = newMat;
                        targetMesh.material.needsUpdate = true;
                    }
                    
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error('Error loading texture:', error);
                    reject(error);
                }
            );
        });
    }

    async loadPartData(partData) {
        if (!partData || !partData.vertices || !Array.isArray(partData.vertices)) {
            console.error('Invalid part data structure');
            return;
        }

        const points = [];
        partData.vertices.forEach(vertex => {
            if (vertex.pointX !== undefined && vertex.pointY !== undefined) {
                points.push(new THREE.Vector2(vertex.pointX, vertex.pointY));
            }
        });

        if (points.length < 3) {
            console.error('Not enough valid vertices to create a shape');
            return;
        }

        // Fetch texture and thickness data first
        const textureIdData = await API.fetchTexture(partData.composite[0].materialId);
        let textureValue;
        if(textureIdData.textureItemId){
            textureValue = await API.fetchTextureValue(textureIdData.textureItemId);
        }else{
            const textureValueArray = await API.loadRALData();
            textureValue = textureValueArray.data.find(item => item.id === textureIdData.colorId)
            console.log(textureValue,"textureValue");
            
        }

        const shape = new THREE.Shape(points);
        const extrudeSettings = {
            steps: 1,
            depth: textureIdData.thickness,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mesh = new THREE.Mesh(geometry);

        if(textureValue.textureItemId){
            try {
                const textureDataUrl = await API.materialData(textureValue.id, textureValue.hash);
                if (textureDataUrl) {
                    await this.applyTextureToMesh(textureDataUrl, mesh);
                }
            } catch (error) {
                console.error('Error loading texture data:', error);
            }
        }else{
            mesh.material = new THREE.MeshBasicMaterial({ color: textureValue.rgb });
        }
        this.scene.add(mesh);
        this.miniViewerSceneObject.push(mesh);
    }

    updateCameraToFit(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));

        cameraZ *= 1.5;

        this.camera.position.set(center.x, center.y + cameraZ, center.z);
        this.camera.lookAt(center);

        this.orbitControls.target.copy(center);
        this.orbitControls.update();
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
        this.cleanupOutline()
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
        this.highlightSelectedObject(intersectedObject);

        this.transformControls.detach();
        this.transformControls.attach(this.pivot);

        const gizmo = this.transformControls.getHelper();
        this.scene.add(gizmo);

        this.setupTransformEvents();

    }

    setupTransformEvents() {
        this.transformControls.addEventListener("dragging-changed", (event) => {
            this.orbitControls.enabled = !event.value;
        });

        this.transformControls.addEventListener('objectChange', () => {
            if (this.transformControls.mode === 'scale') {
                this.dimensions.add3DDimensionsToRectangles(this.intersectedObject)
            }
        });

        this.transformControls.addEventListener("mouseDown", () => this.handleMouseDown());
        this.transformControls.addEventListener("mouseUp", () => this.handleMouseUp());
    }

    handleMouseDown() {
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
    }

    handleMouseUp() {

        if (this.transformControls.mode === "scale") {
            this.finalizeScaling();
            this.transformControls.detach();
            this.dimensions.removeDimensions();
        }
    }

    finalizeScaling() {
        if (this.intersectedObject && this.intersectedObject.parent === this.pivot) {
            this.pivot.remove(this.intersectedObject);
            const originalScale = this.intersectedObject.scale.clone();
            const newScale = new THREE.Vector3(
                this.pivot.scale.x !== 1 ? originalScale.x + this.pivot.scale.x : originalScale.x,
                this.pivot.scale.y !== 1 ? originalScale.y + this.pivot.scale.y : originalScale.y,
                this.pivot.scale.z !== 1 ? originalScale.z + this.pivot.scale.z : originalScale.z
            );
            this.viewer.popup.meshes.forEach(mesh => {
                mesh.scale.copy(newScale);
            });
            this.intersectedObject.applyMatrix4(this.pivot.matrixWorld);
            this.resetPivot();
            this.scene.add(this.intersectedObject);
        }

        this.transformControls.detach();
        this.dimensions.removeDimensions();
    }

    resetPivot() {
        this.pivot.position.set(0, 0, 0);
        this.pivot.scale.set(1, 1, 1);
        this.pivot.rotation.set(0, 0, 0);
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

    animate() {
        requestAnimationFrame(() => this.animate());
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export { MiniViewer }
