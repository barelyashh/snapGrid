import { MiniViewer } from './miniViewer.js';
class Popup {
    constructor(selectedRectangle, onSave, onCancel) {
        this.selectedRectangle = selectedRectangle;
        this.onSave = onSave
        this.onCancel = onCancel
        if (this.selectedRectangle?.parent) {
            const parent = this.selectedRectangle.parent;
            this.initialProperties = {
                position: parent.position.clone(), // ✅ Deep copy of Vector3
                color: `#${parent.material.color.getHexString()}`, // ✅ Ensure correct hex format
                opacity: parent.material.opacity,
                metalness: parent.material.metalness,
                roughness: parent.material.roughness,
                type: parent.userData?.type || "" // ✅ Avoids undefined errors
            };
        }
        this.init();
    }

    init() {
        this.createPopup();
    }

    createPopup() {
        // Remove existing popup if any
        const existingPopup = document.getElementById("popupContainer");
        if (existingPopup) existingPopup.remove();

        // Create popup container
        this.popupContainer = document.createElement("div");
        this.popupContainer.id = "popupContainer";
        this.popupContainer.style.position = "fixed";
        this.popupContainer.style.top = "10%";
        this.popupContainer.style.left = "10%";
        this.popupContainer.style.width = "80%";
        this.popupContainer.style.height = "80%";
        this.popupContainer.style.background = "white";
        this.popupContainer.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
        this.popupContainer.style.zIndex = "1000";
        this.popupContainer.style.borderRadius = "8px";
        this.popupContainer.style.display = "flex";

        // Left side - Mini viewer container
        this.miniContainer = document.createElement("div");
        this.miniContainer.id = "mini-container";
        this.miniContainer.style.width = "60%";
        this.miniContainer.style.height = "100%";
        this.miniContainer.style.background = "#ddd";

        // Right side - Material Properties
        this.detailsContainer = document.createElement("div");
        this.detailsContainer.style.width = "40%";
        this.detailsContainer.style.padding = "20px";
        this.detailsContainer.style.display = "flex";
        this.detailsContainer.style.flexDirection = "column";
        this.detailsContainer.style.background = "#f9f9f9";

        const typeLabel = document.createElement("label");
        typeLabel.innerText = "Type:";
        const typeInput = document.createElement("input");
        typeInput.type = "text";
        typeInput.value = this.selectedRectangle?.parent?.userData?.type || ""; // Load existing type if available
        this.typeInput = typeInput;
        this.detailsContainer.appendChild(typeLabel);
        this.detailsContainer.appendChild(typeInput);
        // Title
        const title = document.createElement("h2");
        title.innerText = "Material Properties";
        this.detailsContainer.appendChild(title);

        this.detailsContainer.appendChild(this.createPositionInput("X Position", "x"));
        this.detailsContainer.appendChild(this.createPositionInput("Y Position", "y"));


        // Color Picker
        // const colorLabel = document.createElement("label");
        // colorLabel.innerText = "Color";
        // const colorInput = document.createElement("input");
        // colorInput.type = "color";
        // colorInput.value = "#ffffff";
        // colorInput.oninput = () => this.updateMaterial('color', colorInput.value);
        // colorLabel.appendChild(colorInput);
        // this.detailsContainer.appendChild(colorLabel);

        // Opacity Slider
        this.detailsContainer.appendChild(this.createSlider("Opacity", "opacity", 0, 1, 0.01));
        // Metalness Slider
        this.detailsContainer.appendChild(this.createSlider("Metalness", "metalness", 0, 1, 0.01));
        // Roughness Slider
        this.detailsContainer.appendChild(this.createSlider("Roughness", "roughness", 0, 1, 0.01));

        // Save Button
        const saveButton = document.createElement("button");
        saveButton.innerText = "Save";
        saveButton.style.marginTop = "20px";
        saveButton.style.padding = "10px";
        saveButton.style.background = "green";
        saveButton.style.color = "white";
        saveButton.style.border = "none";
        saveButton.style.cursor = "pointer";
        saveButton.onclick = () => this.saveChanges();
        this.detailsContainer.appendChild(saveButton);

        const cancelButton = document.createElement("button");
        cancelButton.innerText = "Cancel";
        cancelButton.style.marginTop = "20px";
        cancelButton.style.padding = "10px";
        cancelButton.style.background = "red";
        cancelButton.style.color = "white";
        cancelButton.style.border = "none";
        cancelButton.style.cursor = "pointer";
        cancelButton.onclick = () => this.cancelButton();
        this.detailsContainer.appendChild(cancelButton);

        // Append elements
        this.popupContainer.appendChild(this.miniContainer);
        this.popupContainer.appendChild(this.detailsContainer);
        document.body.appendChild(this.popupContainer);

        // Initialize the mini viewer
        this.miniViewer = new MiniViewer(this.selectedRectangle);
    }

    createSlider(labelText, property, min, max, step) {
        const wrapper = document.createElement("div");
        const label = document.createElement("label");
        label.innerText = labelText;
        const input = document.createElement("input");
        input.type = "range";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = 0.5;
        // input.oninput = () => this.updateMaterial(property, parseFloat(input.value));
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
    }

    createPositionInput(labelText, axis) {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "10px";

        const label = document.createElement("label");
        label.innerText = labelText;
        label.style.marginRight = "10px";

        const input = document.createElement("input");
        input.type = "number";
        input.value = this.selectedRectangle?.parent?.position[axis] || 0;
        input.step = "0.1"; // Small increments
        input.oninput = () => this.updatePosition(axis, parseFloat(input.value));

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
    }

    updatePosition(axis, value) {
        if (!this.selectedRectangle || !this.selectedRectangle.parent) return;
        this.selectedRectangle.parent.position[axis] = value;
    }

    updateMaterial(property, value) {
        if (!this.selectedRectangle || !this.selectedRectangle.parent) return;
        const material = this.selectedRectangle.parent.material;
        switch (property) {
            case 'color':
                material.color.set(value);
                break;
            case 'transparency':
                material.transparent = value;
                break;
            case 'opacity':
                material.opacity = value;
                break;
            case 'metalness':
                material.metalness = value;
                break;
            case 'roughness':
                material.roughness = value;
                break;
            default:
                console.warn(`Unknown property: ${property}`);
        }

        material.needsUpdate = true;
    }


    saveChanges() {
        if (!this.selectedRectangle || !this.selectedRectangle.parent) return;
        this.selectedRectangle.parent.userData.type = this.typeInput.value;
        this.popupContainer.remove();
        if (this.onSave) this.onSave();
    }

    cancelButton() {
        if (this.selectedRectangle?.parent) {
            const parent = this.selectedRectangle.parent;
            parent.position.set(
                this.initialProperties.position.x,
                this.initialProperties.position.y,
                this.initialProperties.position.z
            );
            parent.material.color.set(`#${this.initialProperties.color}`);
            parent.material.opacity = this.initialProperties.opacity;
            parent.material.metalness = this.initialProperties.metalness;
            parent.material.roughness = this.initialProperties.roughness;
            parent.userData.type = this.initialProperties.type;
            parent.material.needsUpdate = true;
        }
        this.popupContainer.remove();
        if (this.onCancel) this.onCancel();
    }

}

export { Popup };
