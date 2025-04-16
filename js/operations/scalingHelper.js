
import * as THREE from 'three';

const getIntersectionPoint = (viwer, mouse, frame) => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, viwer.camera);
    return raycaster.intersectObjects([frame])[0]?.point || null;
};

const adjustPosition = (axis, scale, viwer, modelBox, position, frameBox) => {


    const minBox = viwer.minBox[axis];
    const maxBox = viwer.maxBox[axis];
    const objectPos = viwer.intersectedObject.position[axis];
    const modelMin = modelBox.min[axis];
    const modelMax = modelBox.max[axis];

    if (position[axis] > objectPos && scale > 0) {
        viwer.intersectedObject.position[axis] += (minBox - modelMin);
    } else if (position[axis] < objectPos && scale > 0) {
        viwer.intersectedObject.position[axis] -= (modelMax - maxBox);
    } else {
        // If conditions don't allow update, reset to previous scale
        viwer.intersectedObject.scale[axis] = viwer[`offset${axis.toUpperCase()}`];
    }

    viwer[`offset${axis.toUpperCase()}`] = parseFloat(viwer.intersectedObject.scale[axis].toFixed(1));
};

const applyMinScaleConstraint = (axis, minValue, geometrySize, viwer, mouse) => {
    const currentScale = viwer.intersectedObject.scale[axis];
    const minScale = minValue / geometrySize;

    if (currentScale <= minScale) {
        viwer.intersectedObject.scale[axis] = minScale;
        viwer[`offset${axis.toUpperCase()}`] = parseFloat(minScale.toFixed(1));
        return true;
    }


    return false;
};

const scaleModel = (viwer, frame) => {
    const scaleHandle = viwer.transformControls.axis;
    const currentScale = viwer.intersectedObject.scale.clone();
    const deltaScale = currentScale.clone().sub(viwer.previousScale);
    const dampenedScale = viwer.previousScale.clone().add(deltaScale.multiplyScalar(viwer.scalingDampeningFactor));

    viwer.intersectedObject.scale.copy(dampenedScale);
    viwer.previousScale.copy(dampenedScale);

    if (!["X", "Y", "Z"].includes(scaleHandle)) return;

    const axis = scaleHandle.toLowerCase();
    const geometryParam = viwer.intersectedObject.geometry.parameters
    let dimension;
    if (scaleHandle === 'X') {
        dimension = geometryParam.width;
    } else if (scaleHandle === 'Y') {
        dimension = geometryParam.height;
    } else if (scaleHandle === 'Z') {
        dimension = geometryParam.depth;
    }
    const mouse = viwer.deltaMouse;
    const position = getIntersectionPoint(viwer, mouse, frame);
    const modelBox = new THREE.Box3().setFromObject(viwer.intersectedObject);
    const frameBox = new THREE.Box3().setFromObject(frame);

    if (!position) {
        viwer.intersectedObject.scale[axis] = viwer[`offset${scaleHandle}`];
        return;
    }

    if (applyMinScaleConstraint(axis, 5, dimension, viwer, position)) return;

    adjustPosition(axis, viwer.intersectedObject.scale[axis], viwer, modelBox, position, frameBox);
};


export { scaleModel };
