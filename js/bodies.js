import * as THREE from 'three';
import { DragControls } from "three/addons/controls/DragControls.js";
import { SnapPoints } from './snapToPoints.js';

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
        this.points = [];
        this.innerObjects = []
        this.snap = new SnapPoints(this)
        this.gridPercentage = 0
    }

    addOverallDimension(width, height, depth) {
        if (this.currentWall) {
            this.scene.remove(this.currentWall);
            this.raycasterObject = this.raycasterObject.filter(obj => obj !== this.currentWall);
        }

        this.viewer.overallDimensionValues = { width, height, depth };
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhysicalMaterial({ color: '#82807C', clearcoat: 1, clearcoatRoughness: 0.3, });
        material.transparent = true
        material.opacity = 0.6
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
            this.create2DShape(widthBox, heightBox, depthBox);
        } else {
            this.createRectangle(widthBox, heightBox, depthBox, true)
            this.viewer.animate();
        }
    }

    create2DShape(widthBox, heightBox, depthBox) {
        console.log("v", widthBox, heightBox)
        const tri = new THREE.Shape();
        tri.moveTo(-widthBox / 2, heightBox / 2);
        tri.lineTo(widthBox / 2, heightBox / 2);
        tri.lineTo(widthBox / 2, -heightBox / 2);
        tri.lineTo(-widthBox / 2, -heightBox / 2)
        tri.lineTo(-widthBox / 2, heightBox / 2)
        const geometry = new THREE.ShapeGeometry(tri);
        const lineSegments = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: "#7F4125" }))
        lineSegments.material.side = THREE.DoubleSide
        lineSegments.name = 'segments'
        lineSegments.position.y = 0.3;
        lineSegments.rotation.x = Math.PI / 2
        this.viewer.scene.add(lineSegments);
        this.innerObjects.push({ lineSegments, width: widthBox, height: heightBox, depth: depthBox });
        this.twoDObjects.push(lineSegments)
        this.createRectangle(widthBox, heightBox, depthBox, false, lineSegments)
    }

    createRectangle(widthBox, heightBox, depthBox, visible, lineSegments) {
        const material = new THREE.MeshPhysicalMaterial({ color: '#7F4125', clearcoat: 1, clearcoatRoughness: 0 });
        material.opacity = 0.6
        const rectangle = new THREE.Mesh(new THREE.BoxGeometry(widthBox, heightBox, depthBox), material);
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
        //need to add scale dynamic
        sprite.scale.set(5, 5, 1);
        this.positionSprite(sprite, rectangle);
        sprite.visible = false;
        rectangle.add(sprite);

        if (visible) this.viewer.scene.add(rectangle);
        rectangle.position.y = 0.1;
        if (lineSegments) {
            const object = { lineSegments, width: widthBox, height: heightBox, depth: depthBox }
            this.overallBodies.push({ mesh: rectangle, line: object });
        } else {
            this.overallBodies.push({ mesh: rectangle });
        }

        this.spriteObjects.push(sprite);
        return rectangle

    }

    positionRectangle(rectangle) {
        if (!this.viewer.overallDepth) return;
        const rectDepth = rectangle.geometry.parameters.depth;
        rectangle.position.z = this.viewer.overallDepth / 2 - rectDepth / 2;
    }

    positionSprite(sprite, rectangle) {
        if (!this.viewer.overallDepth) return;
        const rectDepth = rectangle.geometry.parameters.depth;
        sprite.position.set(0, 0, rectDepth / 2 + 3);
    }

    generate2DDrawing() {
        if (this.frame) {
            let positions = this.frame.geometry.attributes.position.array
            const updatedArray = JSON.parse(JSON.stringify(positions))
            for (let i = 0; i < positions.length; i += 3) {
                updatedArray[i + 2] = 0;
            }

            function splitPoints(positions) {
                const uniquePositions = [];
                const seen = new Set();

                for (let i = 0; i < positions.length; i += 3) {
                    const point = new THREE.Vector3(updatedArray[i], updatedArray[i + 1], updatedArray[i + 2]);
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
        if (this.overallBodies) {
            this.overallBodies.forEach((child, i) => {
                let positions = child.mesh.geometry.attributes.position.array

                const updatedArray = JSON.parse(JSON.stringify(positions))
                for (let i = 0; i < positions.length; i += 3) {
                    updatedArray[i + 2] = 0;

                }

                function splitPoints() {
                    const uniquePositions = [];
                    const seen = new Set();

                    for (let i = 0; i < positions.length; i += 3) {
                        const point = new THREE.Vector3(updatedArray[i], updatedArray[i + 1], updatedArray[i + 2]);
                        const key = `${point.x},${point.y},${point.z}`;
                        seen.add(key);
                        uniquePositions.push(point);
                    }

                    return uniquePositions
                }
                let uniquePositionsBuffer1 = splitPoints();
                const tri = new THREE.Shape();
                tri.moveTo(uniquePositionsBuffer1[0].x, uniquePositionsBuffer1[0].y);
                for (let i = 0; i < uniquePositionsBuffer1.length; i++) {
                    tri.lineTo(uniquePositionsBuffer1[i].x, uniquePositionsBuffer1[i].y);
                }
                tri.lineTo(uniquePositionsBuffer1[0].x, uniquePositionsBuffer1[0].y)
                const geometry = new THREE.ShapeGeometry(tri);
                const lineSegments = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: child.mesh.material.color }))
                lineSegments.material.side = THREE.DoubleSide
                lineSegments.name = `segments${i}`;
                lineSegments.rotation.x = Math.PI / 2;
                lineSegments.position.set(child.mesh.position.x, 0.3, -child.mesh.position.y);

                this.viewer.scene.add(lineSegments);
                this.twoDObjects.push(lineSegments);

                const { width, height, depth } = child.mesh.geometry.parameters;;


                this.innerObjects.push({ lineSegments, width, height, depth });
                lineSegments.scale.copy(child.mesh.scale);
                lineSegments.rotation.z = -child.mesh.rotation.z;


                this.overallBodies[i].line = { lineSegments, width, height, depth }

            })
        }
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
                sprite.visible = false;
        }); 
    }

    showAllSprites() {
         this.spriteObjects.forEach(sprite => {
                sprite.visible = true;
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
            this.snap.snapToNearestPoint(draggedObject);
            this.restrictDoorMovement(draggedObject)
            this.snap.snapTogrid(draggedObject)

        });

    }

    addCornerPoints(frame) {
        const boundaryBoundingBox = new THREE.Box3().setFromObject(frame);
        const boundaryMin = boundaryBoundingBox.min;
        const boundaryMax = boundaryBoundingBox.max;
        const step = (this.viewer.size) / this.viewer.division ;
        const halfSize = (this.viewer.size) / 2;
        const halfStep = step / 2;
        const offset = halfSize - halfStep;


        for (let i = 0; i <this.viewer.division; i++) {

            for (let j = 0; j <this.viewer.division; j++) {
                const baseX = offset - i * step;
                const baseZ = offset - j * step;
                const offsetX = step / 2;
                const offsetZ = step / 2;
                if (boundaryMin.x <= baseX && boundaryMax.x >= baseX - offsetX && boundaryMin.y <= baseZ && boundaryMax.y >= baseZ + offsetZ) {
                    this.points.push(new THREE.Vector3(baseX - offsetX, 0.1, baseZ + offsetZ));
                }

            }

        }
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
    switchSnap() {
        this.snapEnabled = !this.snapEnabled;
        if (this.snapEnabled) {
            //wor on 3d snapping points + for 3d use dragballcontrols or something else for snap
            //this.mode2D ? this.bodies.addSnapPointsTo2Drectangles() : this.bodies.addSnapPointsTo3DRectangles();
            this.snap.addSnapPointsTo2Drectangles()
        } else {
            this.snap.removeSnapPoints(this.viewer.mode2D);
        }
    }
}

export { Bodies };
