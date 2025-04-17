import * as THREE from 'three';
class SnapPoints {
    constructor(shapeData) {
        this.shapeData = shapeData,
            this.snapMarkers = []
        this.snapGridLines = []
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
        let frameBox = new THREE.Box3().setFromObject(this.shapeData.viewer.bodies.frame);
        let frameSize = new THREE.Vector3();
        frameBox.getSize(frameSize);
        let threshold = Math.max(frameSize.x, frameSize.y) / 2 * 0.015;
        let closestSnap = null;
        let minDistance = Infinity;

        // Find the associated object from innerObjects
        const draggedObject = this.shapeData.innerObjects.find(obj => obj.lineSegments === draggedMesh);
        if (!draggedObject || !draggedObject.snapPoints) return;

        draggedObject.snapPoints.forEach(draggedSnapPoint => {
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
            const offset = new THREE.Vector3().subVectors(closestSnap.targetPosition, closestSnap.draggedPosition);
            draggedMesh.position.add(offset);
        }
    }

    addSnapPointsTo2Drectangles() {
        if (!this.shapeData.viewer.scene || !this.shapeData.innerObjects.length) return;

        const frameBox = new THREE.Box3().setFromObject(this.shapeData.viewer.bodies.frame);
        const frameSize = new THREE.Vector3();
        frameBox.getSize(frameSize);
        const genericScale = Math.max(frameSize.x, frameSize.y) / 2 * 0.015;

        this.shapeData.innerObjects.forEach(object => {
            object.lineSegments.geometry.computeBoundingBox();
            const bbox = object.lineSegments.geometry.boundingBox;

            if (object.snapPoints) {
                object.snapPoints.forEach(sp => this.shapeData.viewer.scene.remove(sp));
            }
            object.snapPoints = [];

            const worldMatrix = object.lineSegments.matrixWorld;

            const positions = [
                [bbox.min.x, bbox.min.y, 0], // Bottom-left
                [bbox.max.x, bbox.min.y, 0], // Bottom-right
                [bbox.min.x, bbox.max.y, 0], // Top-left
                [bbox.max.x, bbox.max.y, 0], // Top-right
                [bbox.min.x, (bbox.min.y + bbox.max.y) / 2, 0], // Left center
                [bbox.max.x, (bbox.min.y + bbox.max.y) / 2, 0], // Right center
            ];

            positions.forEach(([x, y, z]) => {
                const localPos = new THREE.Vector3(x, y, z);
                const worldPos = localPos.applyMatrix4(worldMatrix); // Convert to world coordinates

                const geometry = new THREE.SphereGeometry(genericScale, 16, 16);
                const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
                const snapPoint = new THREE.Mesh(geometry, material);

                snapPoint.position.copy(worldPos);
                this.shapeData.viewer.scene.add(snapPoint);
                object.snapPoints.push(snapPoint);
                this.shapeData.snapPoints.push(snapPoint);
            });
        });
    }

    updateSnapPointsFor2DRectangles() {
        if (!this.shapeData.viewer.scene || !this.shapeData.innerObjects.length) return;

        this.shapeData.innerObjects.forEach(object => {
            if (!object.snapPoints) return;

            object.lineSegments.geometry.computeBoundingBox();
            const bbox = object.lineSegments.geometry.boundingBox;
            const worldMatrix = object.lineSegments.matrixWorld;

            const positions = [
                [bbox.min.x, bbox.min.y, 0],
                [bbox.max.x, bbox.min.y, 0],
                [bbox.min.x, bbox.max.y, 0],
                [bbox.max.x, bbox.max.y, 0],
                [bbox.min.x, (bbox.min.y + bbox.max.y) / 2, 0],
                [bbox.max.x, (bbox.min.y + bbox.max.y) / 2, 0],
            ];

            positions.forEach(([x, y, z], index) => {
                const localPos = new THREE.Vector3(x, y, z);
                const worldPos = localPos.applyMatrix4(worldMatrix);
                if (object.snapPoints[index]) {
                    object.snapPoints[index].position.copy(worldPos);
                }
            });
        });
    }


    addSnapPointsTo3D() {
        if (!this.shapeData.viewer.scene) return;
        this.snapHoverHelperForFrame = this.createPlusHelper(3, 0.3, 0xff0000);
        this.snapHoverHelperForMesh = this.createPlusHelper(3, 0.3, 0x5dad47);
        this.shapeData.viewer.scene.add(this.snapHoverHelperForFrame)
        this.shapeData.viewer.scene.add(this.snapHoverHelperForMesh)
        if (this.shapeData.frame) {
            this.addSnapPointsToOverallBody()
        }

        this.addSnapPointsToIndividualBodies()
    }

    addSnapPointsToOverallBody() {
        var body = this.shapeData.frame
        const snapPoints = this.generateGridPointsOnBox(body);
        snapPoints.forEach(point => {
            const marker = this.createSnapMarker(point, body);
            this.shapeData.viewer.scene.add(marker);
            this.snapMarkers.push(marker);
        });
        this.drawGridLinesOnBox(body, 4, this.shapeData.viewer.scene);
    }

    addSnapPointsToIndividualBodies() {
        const overAllBodies = []
        this.shapeData.overallBodies.map(body => {
            overAllBodies.push(body.mesh)
        })
        overAllBodies.forEach(object => {
            const snapPoints = this.getSnapPoints(object);
            snapPoints.forEach(point => {
                const marker = this.createSnapMarker(point, object);
                this.shapeData.viewer.scene.add(marker);
                this.snapMarkers.push(marker);
            });
        });
    }

    getFrameScale() {
        const frameBox = new THREE.Box3().setFromObject(this.shapeData.viewer.bodies.frame);
        const frameSize = new THREE.Vector3();
        frameBox.getSize(frameSize);

        // Scale factor could be a small fraction of the largest side
        const scaleFactor = Math.max(frameSize.x, frameSize.y, frameSize.z) * 0.015;
        return scaleFactor
    }

    createSnapMarker(position, parentObject) {
        const scaleFactor = this.getFrameScale()
        const geometry = new THREE.SphereGeometry(scaleFactor, 16, 16);
        // const material = new THREE.MeshBasicMaterial({ color:'#82807C', visible: true});
        const material = new THREE.MeshBasicMaterial({ visible: false });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.userData.isSnapPoint = true;
        marker.userData.owner = parentObject;
        return marker;
    }

    generateGridPointsOnBox(object, segments = 4) {
        const box = new THREE.Box3().setFromObject(object);
        const min = box.min;
        const max = box.max;

        const stepX = (max.x - min.x) / segments;
        const stepY = (max.y - min.y) / segments;
        const stepZ = (max.z - min.z) / segments;

        const points = [];

        // XY planes (front and back)
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                points.push(new THREE.Vector3(min.x + i * stepX, min.y + j * stepY, min.z)); // front
                points.push(new THREE.Vector3(min.x + i * stepX, min.y + j * stepY, max.z)); // back
            }
        }

        // YZ planes (left and right)
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                points.push(new THREE.Vector3(min.x, min.y + i * stepY, min.z + j * stepZ)); // left
                points.push(new THREE.Vector3(max.x, min.y + i * stepY, min.z + j * stepZ)); // right
            }
        }

        // XZ planes (top and bottom)
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                points.push(new THREE.Vector3(min.x + i * stepX, min.y, min.z + j * stepZ)); // bottom
                points.push(new THREE.Vector3(min.x + i * stepX, max.y, min.z + j * stepZ)); // top
            }
        }

        return points;
    }

    drawGridLinesOnBox(object, segments = 4, scene) {
        const box = new THREE.Box3().setFromObject(object);
        const min = box.min;
        const max = box.max;

        const stepX = (max.x - min.x) / segments;
        const stepY = (max.y - min.y) / segments;
        const stepZ = (max.z - min.z) / segments;

        const material = new THREE.LineBasicMaterial({ color: 0x00ffff }); // light blue

        const addLine = (start, end) => {
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const line = new THREE.Line(geometry, material);
            this.snapGridLines.push(line); // store reference
            scene.add(line);
        };

        // ===== XY planes (front and back) =====
        for (let i = 0; i <= segments; i++) {
            const x = min.x + i * stepX;

            // Vertical lines (Y)
            addLine(new THREE.Vector3(x, min.y, min.z), new THREE.Vector3(x, max.y, min.z)); // front
            addLine(new THREE.Vector3(x, min.y, max.z), new THREE.Vector3(x, max.y, max.z)); // back
        }

        for (let j = 0; j <= segments; j++) {
            const y = min.y + j * stepY;

            // Horizontal lines (X)
            addLine(new THREE.Vector3(min.x, y, min.z), new THREE.Vector3(max.x, y, min.z)); // front
            addLine(new THREE.Vector3(min.x, y, max.z), new THREE.Vector3(max.x, y, max.z)); // back
        }

        // ===== YZ planes (left and right) =====
        for (let i = 0; i <= segments; i++) {
            const y = min.y + i * stepY;

            // Vertical lines (Z)
            addLine(new THREE.Vector3(min.x, y, min.z), new THREE.Vector3(min.x, y, max.z)); // left
            addLine(new THREE.Vector3(max.x, y, min.z), new THREE.Vector3(max.x, y, max.z)); // right
        }

        for (let j = 0; j <= segments; j++) {
            const z = min.z + j * stepZ;

            // Horizontal lines (Y)
            addLine(new THREE.Vector3(min.x, min.y, z), new THREE.Vector3(min.x, max.y, z)); // left
            addLine(new THREE.Vector3(max.x, min.y, z), new THREE.Vector3(max.x, max.y, z)); // right
        }

        // ===== XZ planes (top and bottom) =====
        for (let i = 0; i <= segments; i++) {
            const x = min.x + i * stepX;

            // Vertical lines (Z)
            addLine(new THREE.Vector3(x, min.y, min.z), new THREE.Vector3(x, min.y, max.z)); // bottom
            addLine(new THREE.Vector3(x, max.y, min.z), new THREE.Vector3(x, max.y, max.z)); // top
        }

        for (let j = 0; j <= segments; j++) {
            const z = min.z + j * stepZ;

            // Horizontal lines (X)
            addLine(new THREE.Vector3(min.x, min.y, z), new THREE.Vector3(max.x, min.y, z)); // bottom
            addLine(new THREE.Vector3(min.x, max.y, z), new THREE.Vector3(max.x, max.y, z)); // top
        }
    }


    getSnapPoints(object) {
        const box = new THREE.Box3().setFromObject(object);
        const min = box.min;
        const max = box.max;

        // Generate all 8 corners of the box
        //wrk on midpoints and update the visuals for snappoints for mesh yash
        return [
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(max.x, min.y, min.z),
            new THREE.Vector3(max.x, max.y, min.z),
            new THREE.Vector3(min.x, max.y, min.z),

            new THREE.Vector3(min.x, min.y, max.z),
            new THREE.Vector3(max.x, min.y, max.z),
            new THREE.Vector3(max.x, max.y, max.z),
            new THREE.Vector3(min.x, max.y, max.z),
        ];
    }

    createPlusHelper(baseSize = 5, thickness = 0.1, color = 0xff0000) {
        const scaleFactor = this.getFrameScale()

        const size = baseSize * scaleFactor;
        const thick = thickness * scaleFactor;
        const material = new THREE.MeshBasicMaterial({ color: color });
        const boxX = new THREE.BoxGeometry(size, thick, thick);
        const boxY = new THREE.BoxGeometry(thick, size, thick);

        const meshX = new THREE.Mesh(boxX, material);
        const meshY = new THREE.Mesh(boxY, material);

        const group = new THREE.Group();
        group.add(meshX);
        group.add(meshY);
        group.visible = false;

        return group;
    }

    clearSnapGridData() {
        if (!this.snapGridLines) return;
        this.snapGridLines.forEach(line => this.shapeData.viewer.scene.remove(line));
        this.snapGridLines = [];

        if (this.snapMarkers) {
            this.snapMarkers.forEach(marker => this.shapeData.viewer.scene.remove(marker));
            this.snapMarkers = [];
        }

        if (this.snapHoverHelperForFrame) {
            this.shapeData.viewer.scene.remove(this.snapHoverHelperForFrame);
            this.snapHoverHelperForFrame = null;
        }
        if (this.snapHoverHelperForMesh) {
            this.shapeData.viewer.scene.remove(this.snapHoverHelperForMesh);
            this.snapHoverHelperForMesh = null;
        }
    }

    rebuildSnapMarkers3D() {
        if (this.shapeData.viewer.bodies.snapEnabled) {
            this.snapMarkers.forEach(marker => {
                this.shapeData.viewer.scene.remove(marker);
            });
            this.snapMarkers = [];
            this.addSnapPointsTo3D();
        }
    }

    rebuildSnapMarkers2D() {
        this.clearSnapGridData();
        this.removeSnapPoints(true); // true for 2D
        this.addSnapPointsTo2Drectangles();
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