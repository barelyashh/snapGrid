import * as THREE from 'three';


class Dimensions {
    constructor(viewer) {
        this.viewer = viewer
        this.dimensionLines = []
    }

    add3DDimensionsToRectangles(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size); // Get the updated dimensions
        box.getCenter(center); // Get the new center of the object

        if (mesh.userData.dimensionLines) {
            mesh.userData.dimensionLines.forEach(line => this.viewer.scene.remove(line));
        }
        if (mesh.userData.dimensionLabels) {
            mesh.userData.dimensionLabels.forEach(label => label.remove());
        }

        const width = size.x;
        const height = size.y;
        //need to work find genric solution for it
        const position = (mesh.parent.name === 'scene') ? mesh.position.clone() : new THREE.Vector3(0, 0, 0);

        const scale = mesh.scale.clone();
        const createDimensionArrows = (start, end) => {
            const direction = new THREE.Vector3().subVectors(end, start).normalize();
            const length = start.distanceTo(end);
            const cameraDistance = this.viewer.camera.position.distanceTo(center);
            const arrowSize = cameraDistance * 0.02; // size of arrowhead
            const arrowWidth = cameraDistance * 0.008; // width of arrowhead

            const arrow1 = new THREE.ArrowHelper(direction, start, length, 0x000000, arrowSize, arrowWidth);
            const arrow2 = new THREE.ArrowHelper(direction.clone().negate(), end, length, 0x000000, arrowSize, arrowWidth);

            this.viewer.scene.add(arrow1);
            this.viewer.scene.add(arrow2);
            this.dimensionLines.push(arrow1, arrow2);

            return [arrow1, arrow2];
        };

        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const offsetDistance = 5; // Adjust this value for spacing

        const topStart = new THREE.Vector3(center.x - halfWidth, center.y + halfHeight + offsetDistance, center.z);
        const topEnd = new THREE.Vector3(center.x + halfWidth, center.y + halfHeight + offsetDistance, center.z);

        const sideStart = new THREE.Vector3(center.x + halfWidth + offsetDistance, center.y - halfHeight, center.z);
        const sideEnd = new THREE.Vector3(center.x + halfWidth + offsetDistance, center.y + halfHeight, center.z);

        const topArrows = createDimensionArrows(topStart, topEnd);
        const sideArrows = createDimensionArrows(sideStart, sideEnd);

        mesh.userData.dimensionLines = [...topArrows, ...sideArrows];

        const createDimensionLabel = (text, position) => {
            const label = document.createElement('div');
            label.className = 'dimension-label';
            label.textContent = text;
            label.style.position = 'absolute';
            label.style.color = 'black';
            label.style.background = 'white';
            label.style.padding = '2px 5px';
            label.style.fontSize = '12px';
            var container = document.getElementById('mini-container')
            if (container) {
                container.appendChild(label);
            } else {
                document.body.appendChild(label)
            }

            const updateLabelPosition = () => {

                const screenPosition = position.clone().project(this.viewer.camera);
                const x = (screenPosition.x * 0.5 + 0.5) * this.viewer.widthO;
                const y = (-screenPosition.y * 0.5 + 0.5) * this.viewer.heightO;
                label.style.left = `${x}px`;
                label.style.top = `${y}px`;
            };

            updateLabelPosition();
            return { element: label, updatePosition: updateLabelPosition };
        };

        const topLabel = createDimensionLabel(`${Math.round(width * scale.x)} mm`, new THREE.Vector3(position.x, position.y + halfHeight + 10, position.z));
        const sideLabel = createDimensionLabel(`${Math.round(height * scale.y)} mm`, new THREE.Vector3(position.x + halfWidth + 10, position.y, position.z));

        mesh.userData.dimensionLabels = [topLabel.element, sideLabel.element];

        const updateLabels = () => {
            topLabel.updatePosition();
            sideLabel.updatePosition();
        };

        this.viewer.orbitControls.addEventListener('change', updateLabels);
    }

    removeDimensions() {
        if (this.dimensionLines.length > 0) {
            this.dimensionLines.forEach(line => this.viewer.scene.remove(line));
            this.dimensionLines = [];
        }

        document.querySelectorAll('.dimension-label').forEach(label => label.remove());

        // Remove references from userData for each mesh
        if (this.viewer.bodies) {
            this.viewer.bodies.overallBodies.forEach(mesh => {
                if (mesh.mesh.userData.dimensionLines) {
                    mesh.mesh.userData.dimensionLines.forEach(line => this.viewer.scene.remove(line));
                    delete mesh.mesh.userData.dimensionLines;
                }
                if (mesh.mesh.userData.dimensionLabels) {
                    mesh.mesh.userData.dimensionLabels.forEach(label => label.remove());
                    delete mesh.mesh.userData.dimensionLabels;
                }
            });
        }

    }
}

export { Dimensions }