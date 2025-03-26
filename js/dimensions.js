import * as THREE from 'three';


class Dimensions {
    constructor(viewer) {
        this.viewer = viewer
        this.dimensionLines = []
    }

    add3DDimensionsToRectangles(mesh) {
        console.log(this.viewer.isMiniViewerEnabaled)
        // Remove existing dimension lines and labels if they exist
        if (mesh.userData.dimensionLines) {
            mesh.userData.dimensionLines.forEach(line => this.viewer.scene.remove(line));
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
    
            this.viewer.scene.add(arrow1);
            this.viewer.scene.add(arrow2);
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
                const screenPosition = position.clone().project(this.viewer.camera);
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
    
        this.viewer.orbitControls.addEventListener('change', updateLabels);
    }
    
    positionDimensionLines(){
        this.dimensionLines.forEach((line) => {
            line.geometry.computeBoundingBox();
            const boundingBox = line.geometry.boundingBox;
    
            if (!boundingBox) return; // Ensure bounding box exists
    
            // Get the depth from bounding box
            const rectDepth = boundingBox.max.z - boundingBox.min.z;
    
            // Position the line at the top of overall depth
          //  line.position.z = this.viewer.overallDepth / 2 - rectDepth / 2 ;
          line.position.set(0, 0, rectDepth / 2 + 5);
        })
    }

    removeDimensions() {
        // Remove all dimension lines (arrows)
        if (this.dimensionLines.length > 0) {
            this.dimensionLines.forEach(line => this.viewer.scene.remove(line));
            this.dimensionLines = [];
        }
    
        // Remove all 2D labels
        document.querySelectorAll('.dimension-label').forEach(label => label.remove());
    
        // Remove references from userData for each mesh
        if(  this.viewer.bodies){
            this.viewer.bodies.overallBodies.forEach(mesh => {
                if (mesh.userData.dimensionLines) {
                    mesh.userData.dimensionLines.forEach(line => this.viewer.scene.remove(line));
                    delete mesh.userData.dimensionLines;
                }
                if (mesh.userData.dimensionLabels) {
                    mesh.userData.dimensionLabels.forEach(label => label.remove());
                    delete mesh.userData.dimensionLabels;
                }
            });
        }
        
    }
    

}

export { Dimensions }