import * as THREE from 'three';
import { DragControls } from "three/addons/controls/DragControls.js";
class Bodies {
    constructor(viewer) {
        this.viewer = viewer
        this.spriteObjects = [];
        this.arcBodies = [];
        this.overallBodies = [];
        this.frame = {}
        this.twoDObjects = []
        this.transformEnabled = true
        this.snapPoints = []
    }

    addOverallDimension(width, height, depth) {
        if (this.currentWall) {
            this.scene.remove(this.currentWall);
            this.raycasterObject = this.raycasterObject.filter(obj => obj !== this.currentWall);
        }

        this.viewer.overallDimensionValues = { width, height, depth };
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhysicalMaterial({ color: '#82807C', clearcoat: 1, clearcoatRoughness: 0.3, });
        this.frame = new THREE.Mesh(geometry, material);
        this.frame.castShadow = true;
        this.frame.receiveShadow = true;
        this.frame.name = 'frame'
        this.frame.position.z = -0.1;
        this.viewer.scene.add(this.frame);
        this.viewer.raycasterObject.push(this.frame);
        this.viewer.currentWall = this.frame;
        const objectMaxSize = Math.max(this.frame.geometry.parameters.width, this.frame.geometry.parameters.height)
        this.viewer.position.z = objectMaxSize
        this.viewer.camera.position.set(0, 0, objectMaxSize);
        this.viewer.setupPlane();
    }


    addRectangle({ widthBox, heightBox, depthBox }) {
        if (this.viewer.mode2D) {
            const rectangle = this.createRectangle(widthBox, heightBox, depthBox)
            this.generate2DDrawingForOverAllBodies()
        } else {
            const rectangle = this.createRectangle(widthBox, heightBox, depthBox)
            this.viewer.scene.add(rectangle);
        }
    }

    createRectangle(widthBox, heightBox, depthBox){
        const geometry = new THREE.BoxGeometry(widthBox, heightBox, depthBox);
        const material = new THREE.MeshPhysicalMaterial({ color: '#7F4125', clearcoat: 1, clearcoatRoughness: 0 });
        const rectangle = new THREE.Mesh(geometry, material);
        rectangle.castShadow = true;
        rectangle.receiveShadow = true;
        rectangle.name = 'shape';
        this.positionRectangle(rectangle);
        const textureLoader = new THREE.TextureLoader();
        const spriteMaterial = new THREE.SpriteMaterial({
            map: textureLoader.load('./images/sprite.png'),
            transparent: true
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(5, 5, 1);
        this.positionSprite(sprite, rectangle);
        sprite.visible = false;
        rectangle.add(sprite);
        rectangle.position.y = 0.1;
        this.overallBodies.push(rectangle);
        this.spriteObjects.push(sprite);

        const { width, height, depth } = rectangle.geometry.parameters;
        rectangle.userData = { width, height, depth };
        this.viewer.animate();
        return rectangle
    }

    positionRectangle(rectangle) {
        if (!this.viewer.overallDepth) return;
        const rectDepth = rectangle.geometry.parameters.depth;
        rectangle.position.z = this.viewer.overallDepth / 2 - rectDepth / 2;
    }
    positionOverAllBodies(mesh){
        if (!this.viewer.overallDepth) return;
      
            const rectDepth = mesh.geometry.parameters.depth;
            mesh.position.z = this.viewer.overallDepth / 2 - rectDepth / 2; 
       
    }

    positionSprite(sprite, rectangle) {
        if (!this.viewer.overallDepth) return;
        const rectDepth = rectangle.geometry.parameters.depth;
        sprite.position.set(0, 0, rectDepth / 2 + 2);
    }

    generate2DDrawing() {
        if (this.frame) {
            this.generate2DDrawingForFrame()

        }
        if (this.overallBodies) {
           this.generate2DDrawingForOverAllBodies()
        }
    }

    generate2DDrawingForOverAllBodies(){
        this.overallBodies.forEach((mesh, i) => {
            let positions = mesh.geometry.attributes.position.array
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] = 0;
            }
            function splitPoints(positions) {
                const uniquePositions = [];
                const seen = new Set();

                for (let i = 0; i < positions.length; i += 3) {
                    const point = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
                    const key = `${point.x},${point.y},${point.z}`;
                    seen.add(key);
                    uniquePositions.push(point);
                }

                return uniquePositions
            }
            let uniquePositionsBuffer1 = splitPoints(positions);
            const tri = new THREE.Shape();
            tri.moveTo(uniquePositionsBuffer1[0].x, uniquePositionsBuffer1[0].y);
            for (let i = 0; i < uniquePositionsBuffer1.length; i++) {
                tri.lineTo(uniquePositionsBuffer1[i].x, uniquePositionsBuffer1[i].y);
            }
            tri.lineTo(uniquePositionsBuffer1[0].x, uniquePositionsBuffer1[0].y)
            const geometry = new THREE.ShapeGeometry(tri);
            const lineSegments = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: mesh.material.color }))
            lineSegments.material.side = THREE.DoubleSide
            lineSegments.name = `segments${i}`;
            lineSegments.rotation.x = Math.PI / 2;
            lineSegments.position.set(mesh.position.x, 0.3, -mesh.position.y);

            this.viewer.scene.add(lineSegments);
            this.twoDObjects.push(lineSegments);

            const { width, height, depth } = mesh.userData;
            lineSegments.userData = { width, height, depth };

            lineSegments.scale.copy(mesh.scale);
            lineSegments.rotation.z = -mesh.rotation.z;

            mesh.userData.line = lineSegments;
            lineSegments.userData.originalMesh = mesh;

        })
    }

    generate2DDrawingForFrame(){
        let positions = this.frame.geometry.attributes.position.array
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] = 0;
        }

        function splitPoints(positions) {
            const uniquePositions = [];
            const seen = new Set();

            for (let i = 0; i < positions.length; i += 3) {
                const point = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
                const key = `${point.x},${point.y},${point.z}`;
                seen.add(key);
                uniquePositions.push(point);
            }
            return uniquePositions
        }

        let uniquePositionsBuffer1 = splitPoints(positions);
        const tri = new THREE.Shape();
        tri.moveTo(uniquePositionsBuffer1[0].x, uniquePositionsBuffer1[0].y);
        for (let i = 0; i < uniquePositionsBuffer1.length; i++) {
            tri.lineTo(uniquePositionsBuffer1[i].x, uniquePositionsBuffer1[i].y);
        }
        tri.lineTo(uniquePositionsBuffer1[0].x, uniquePositionsBuffer1[0].y)
        const geometry = new THREE.ShapeGeometry(tri);
        const lineSegments = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#C1C0BD' }));
        lineSegments.material.side = THREE.DoubleSide
        lineSegments.name = 'lineSegments'
        lineSegments.rotation.x = Math.PI / 2
        lineSegments.position.y = -0.1;
        this.viewer.scene.add(lineSegments);
    }


    toggleTransformMode() {
        this.transformEnabled = !this.transformEnabled;

        if (this.transformEnabled) {
            this.viewer.scene.add(this.viewer.transformControls);
        } else {
            this.viewer.scene.remove(this.viewer.transformControls);
            this.viewer.transformControls.detach();
        }
        this.spriteObjects.forEach(obj => obj.visible = !this.transformEnabled);
    }

    hideAllSprites() {
        this.spriteObjects.forEach(sprite => {
            if (sprite.isSprite) {
                sprite.visible = true;
            }
        });
    }

    addDragControls(event) {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        let cam = this.viewer.camera;
        this.renderer = this.viewer.renderer;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, cam);

        this.intersects = this.raycaster.intersectObjects(this.twoDObjects);
        this.dragControls = new DragControls(this.twoDObjects, cam, this.renderer.domElement);
        this.dragControls.addEventListener("drag", (event) => {
            const draggedObject = event.object;
            this.snapToNearestPoint(draggedObject);
            this.restrictDoorMovement(draggedObject)
        });

    }

    restrictDoorMovement(intersectedObject,) {
        const modelBoundingBox = new THREE.Box3().setFromObject(intersectedObject);
        const restrictPosition = (position, halfDimension, rectangleHalf) => {
            return THREE.MathUtils.clamp(position, halfDimension, rectangleHalf);
        };
        const boundaryBoundingBox = new THREE.Box3().setFromObject(this.frame);
        const modelSize = modelBoundingBox.getSize(new THREE.Vector3());

        const boundaryMin = boundaryBoundingBox.min;
        const boundaryMax = boundaryBoundingBox.max;

        const modelHalfWidth = modelSize.x / 2;
        const modelHalfHeight = modelSize.z / 2;

        const intersectedPosition = intersectedObject.position;

        if (boundaryMax.x < modelBoundingBox.max.x || boundaryMin.x > modelBoundingBox.min.x || boundaryMin.y > -modelBoundingBox.max.z || boundaryMax.y < -modelBoundingBox.min.z) {
            intersectedPosition.x = restrictPosition(intersectedPosition.x, boundaryMin.x + modelHalfWidth, boundaryMax.x - modelHalfWidth);
            intersectedPosition.z = restrictPosition(intersectedPosition.z, boundaryMin.y + modelHalfHeight, boundaryMax.y - modelHalfHeight);
            intersectedPosition.y = 0.1;
            return;
        }

    }

    snapToNearestPoint(draggedMesh) {
        let threshold = 5; // Adjust as needed
        let closestSnap = null;
        let minDistance = Infinity;
        if (!draggedMesh.userData.snapPoints) return
        draggedMesh.userData.snapPoints.forEach(draggedSnapPoint => {
            let draggedWorldPos = new THREE.Vector3();
            draggedSnapPoint.getWorldPosition(draggedWorldPos);

            this.snapPoints.forEach(targetSnapPoint => {
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

    addSnapPointsTo3DRectangles() {

        if (!this.viewer.scene || !this.overallBodies.length) return;
        this.overallBodies.forEach(rectangle => {
            const { width, height, depth } = rectangle.geometry.parameters;
            rectangle.userData.snapPoints = [];
            const positions = [
                // Corners
                [-width / 2, -height / 2, depth / 2], // Bottom-left front
                [width / 2, -height / 2, depth / 2], // Bottom-right front
                [-width / 2, height / 2, depth / 2], // Top-left front
                [width / 2, height / 2, depth / 2], // Top-right front

                // Midpoints of edges
                [0, -height / 2, depth / 2], // Bottom front edge
                [0, height / 2, depth / 2], // Top front edge
                [-width / 2, 0, depth / 2], // Left front edge
                [width / 2, 0, depth / 2], // Right front edge

                // Center points
                [0, 0, depth / 2], // Front center
                [0, 0, -depth / 2], // Back center
            ];

            positions.forEach(([x, y, z]) => {
                const geometry = new THREE.BoxGeometry(2, 2, 2); // Small wireframe box as snap point
                const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                const snapPoint = new THREE.Mesh(geometry, material);

                snapPoint.position.set(
                    x, y, z
                );
                rectangle.add(snapPoint); // Attach snap point to the rectangle
                rectangle.userData.snapPoints.push(snapPoint);
                this.snapPoints.push(snapPoint);
            });
        });
    }

    addSnapPointsTo2Drectangles() {
        if (!this.viewer.scene || !this.twoDObjects.length) return;
        this.twoDObjects.forEach(lineSegment => {
            lineSegment.geometry.computeBoundingBox();
            const bbox = lineSegment.geometry.boundingBox;

            if (lineSegment.userData.snapPoints) {
                lineSegment.userData.snapPoints.forEach(sp => this.viewer.scene.remove(sp));
            }
            lineSegment.userData.snapPoints = [];

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
                lineSegment.add(snapPoint);
                lineSegment.userData.snapPoints.push(snapPoint);
                this.snapPoints.push(snapPoint);
            });
        });
    }

    removeSnapPoints(mode) {
        if (!this.viewer.scene || !this.overallBodies.length) return;
        if (mode) {
            this.twoDObjects.forEach(rectangle => {
                if (rectangle.userData.snapPoints) {
                    rectangle.userData.snapPoints.forEach(snapPoint => {
                        this.viewer.scene.remove(snapPoint);
                        rectangle.remove(snapPoint); // Also remove from the rectangle
                    });
                    rectangle.userData.snapPoints = []; // Clear snap points from rectangle
                }
            })
        }
        else {
            this.overallBodies.forEach(rectangle => {
                if (rectangle.userData.snapPoints) {
                    rectangle.userData.snapPoints.forEach(snapPoint => {
                        this.viewer.scene.remove(snapPoint);
                        rectangle.remove(snapPoint); // Also remove from the rectangle
                    });
                    rectangle.userData.snapPoints = []; // Clear snap points from rectangle
                }
            });
        }
        this.snapPoints = []; // Clear the global snap points array
    }
}

export { Bodies };
