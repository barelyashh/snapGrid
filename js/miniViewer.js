import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class MiniViewer {
    constructor(rectangle) {
        this.init(rectangle);
    }

    init(rectangle) {
        this.container = document.getElementById("mini-container");

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe5e5e5);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 10, 10000);
        this.camera.position.set(0, 0, 175);
        this.scene.add(this.camera);

        // Lights
        this.lights = new THREE.AmbientLight();
        this.scene.add(this.lights);

        // Copy the clicked rectangle
        rectangle.visible = false
        const clonedRectangle = rectangle.parent.clone();
        clonedRectangle.position.set(0, 0, 0); // Center in the mini viewer
        this.scene.add(clonedRectangle);

        // Add Orbit Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export { MiniViewer }
