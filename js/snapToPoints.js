import * as THREE from 'three';
class SnapPoints {
    constructor(shapeData) {
        this.shapeData = shapeData
    }
    snapTogrid(draggedObject) {
        if (!this.shapeData.points.length > 0) return

        const modelBoundingBox = new THREE.Box3().setFromObject(draggedObject);
        const modelMin = modelBoundingBox.min;
        const modelMax = modelBoundingBox.max;
        const boundary = [
            [modelMin.x, modelMin.z, 0], // Bottom-left
            [modelMax.x, modelMin.z, 0], // Bottom-right
            [modelMin.x, modelMax.z, 0], // Top-left
            [modelMax.x, modelMax.z, 0] // Top-right 
        ]

        let distance = 0

        this.shapeData.points.forEach((point) => {
            boundary.forEach(([x, y]) => {
                distance = new THREE.Vector3(x, draggedObject.position.y, -y).distanceTo(point);
                if (distance < this.shapeData.gridPercentage) {
                    let offset = new THREE.Vector3().subVectors(point, new THREE.Vector3(x, draggedObject.position.y, -y))
                    if (point.x <= modelMin.x || point.x >= modelMax.x || point.z > -modelMin.z || point.z < -modelMax.z) {
                        draggedObject.position.add(new THREE.Vector3(offset.x, 0, -offset.z))
                    }
                }
            })
        })
    }

    snapToNearestPoint(draggedMesh) {
        let threshold = 5; // Adjust as needed
        let closestSnap = null;
        let minDistance = Infinity;
        if (!draggedMesh.children) return
        draggedMesh.children.forEach(draggedSnapPoint => {
            let draggedWorldPos = new THREE.Vector3();
            draggedSnapPoint.getWorldPosition(draggedWorldPos);

            this.shapeData.snapPoints.forEach(targetSnapPoint => {
                if (targetSnapPoint === draggedSnapPoint) return;

                let targetWorldPos = new THREE.Vector3();
                targetSnapPoint.getWorldPosition(targetWorldPos);

                let distance = draggedWorldPos.distanceTo(targetWorldPos);

                if (distance < threshold && distance < minDistance) {
                    minDistance = distance;
                    closestSnap = {
                        targetPosition: targetWorldPos.clone(),
                        draggedPosition: draggedWorldPos.clone()
                    };
                }
            });
        });

        if (closestSnap) {
            let offset = new THREE.Vector3().subVectors(closestSnap.targetPosition, closestSnap.draggedPosition);
            draggedMesh.position.add(offset);
        }
    }

    addSnapPointsTo2Drectangles() {
        if (!this.shapeData.viewer.scene || !this.shapeData.innerObjects.length) return;
        this.shapeData.innerObjects.forEach(object => {
            object.lineSegments.geometry.computeBoundingBox();
            const bbox = object.lineSegments.geometry.boundingBox;

            if (object.snapPoints) {
                object.snapPoints.forEach(sp => this.shapeData.viewer.scene.remove(sp));
            }
            object.snapPoints = [];

            const positions = [
                [bbox.min.x, bbox.min.y, 0], // Bottom-left
                [bbox.max.x, bbox.min.y, 0], // Bottom-right
                [bbox.min.x, bbox.max.y, 0], // Top-left
                [bbox.max.x, bbox.max.y, 0], // Top-right
                [bbox.min.x, (bbox.min.y + bbox.max.y) / 2, 0], // Left center
                [bbox.max.x, (bbox.min.y + bbox.max.y) / 2, 0], // Right center
            ];

            positions.forEach(([x, y, z]) => {
                const geometry = new THREE.BoxGeometry(2, 2, 2);
                const material = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false });
                const snapPoint = new THREE.Mesh(geometry, material);

                snapPoint.position.set(x, y, z);
                const frontFaceVertices = [
                    1, 1, -1,
                    -1, 1, -1,
                    -1, -1, -1,
                    1, -1, -1,
                    1, 1, -1,
                ];

                const frontFaceGeometry = new THREE.BufferGeometry();
                frontFaceGeometry.setAttribute(
                    'position',
                    new THREE.Float32BufferAttribute(frontFaceVertices, 3)
                );
                const edgeMaterial = new THREE.LineBasicMaterial({ color: 'blue', transparent: true, opacity: 0.3 });
                const borderLine = new THREE.Line(frontFaceGeometry, edgeMaterial);
                borderLine.scale.set(1.5, 1.5, 1.5)
                snapPoint.add(borderLine);
                object.lineSegments.add(snapPoint);
                object.snapPoints.push(snapPoint);
                this.shapeData.snapPoints.push(snapPoint);
            });
        });
    }

    removeSnapPoints(mode) {
        if (!this.shapeData.viewer.scene || !this.shapeData.overallBodies.length) return;
        if (mode) {
            this.shapeData.innerObjects.forEach(object => {
                if (object.snapPoints) {
                    object.snapPoints.forEach(snapPoint => {
                        this.shapeData.viewer.scene.remove(snapPoint);
                        object.lineSegments.remove(snapPoint); // Also remove from the object
                    });
                    object.snapPoints = []; // Clear snap points from rectangle
                }
            })
        }
        else {
            this.shapeData.overallBodies.forEach(rectangle => {
                if (rectangle.mesh.userData.snapPoints) {
                    rectangle.mesh.userData.snapPoints.forEach(snapPoint => {
                        this.shapeData.viewer.scene.remove(snapPoint);
                        rectangle.mesh.remove(snapPoint); // Also remove from the rectangle.mesh
                    });
                    rectangle.mesh.userData.snapPoints = []; // Clear snap points from rectangle.mesh
                }
            });
        }
        this.shapeData.snapPoints = []; // Clear the global snap points array
    }
}
export { SnapPoints }