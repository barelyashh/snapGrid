import { MiniViewer } from './miniViewer.js';
class Popup {
    constructor(selectedRectangle, viewer, onSave, onCancel) {
        this.selectedRectangle = selectedRectangle;
        this.onSave = onSave
        this.onCancel = onCancel
        this.viewer = viewer
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
        this.createDimensionBox()
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

        // Replace the type text input with dropdown
        const typeLabel = document.createElement("label")
        typeLabel.innerText = "Type:"
        const typeSelect = document.createElement("select")
        typeSelect.style.marginBottom = "15px"
        typeSelect.style.padding = "5px"
        
        // Add the four type options
        const types = ["Choose the type!!","article", "part", "profile", "item master"]
        types.forEach(type => {
            const option = document.createElement("option")
            option.value = type
            option.text = type.charAt(0).toUpperCase() + type.slice(1) // Capitalize first letter
            typeSelect.appendChild(option)
        })

        // Create scrollable data box
        const dataBoxContainer = document.createElement("div")
        dataBoxContainer.style.marginTop = "15px"
        dataBoxContainer.style.marginBottom = "15px"
        
        const dataBox = document.createElement("div")
        dataBox.style.height = "200px"
        dataBox.style.overflowY = "auto"
        dataBox.style.border = "1px solid #ccc"
        dataBox.style.padding = "10px"
        dataBox.style.borderRadius = "4px"
        dataBox.style.backgroundColor = "#fff"
        dataBox.innerHTML = '<div>Please Choose the Type!!</div>'

        // Handle type change
        typeSelect.onchange = async () => {
            const selectedType = typeSelect.value
            dataBox.innerHTML = '' // Clear previous content
            
            switch(selectedType) {
                case 'Choose the type!!':
                    dataBox.innerHTML = '<div>Please Choose the Type!!</div>'
                    break
                case 'article':
                    await this.loadArticleData()
                    if (this.articleData) {
                        console.log("data", this.articleData)
                        this.articleData.data.forEach(article => {
                            const div = document.createElement("div")
                            div.style.padding = "5px"
                            div.style.borderBottom = "1px solid #eee"
                            div.textContent = article.name
                            div.value = article.id 

                            div.style.cursor = "pointer"
                            div.style.transition = "background-color 0.3s"

                            div.onmouseover = () => {
                                div.style.backgroundColor = "#f0f0f0" 
                            }
                            div.onmouseout = () => {
                                div.style.backgroundColor = "" 
                            }
                            div.onclick = () => {
                                this.handleItemClick(article.id) 
                            }

                            dataBox.appendChild(div)
                        })
                    }
                    break
                case 'part':
                    await this.loadPartData()
                    if (this.partData) {
                        console.log("data", this.partData)
                        this.partData.data.forEach(part => {
                            const div = document.createElement("div")
                            div.style.padding = "5px"
                            div.style.borderBottom = "1px solid #eee"
                            div.textContent = part.name.en
                            div.value = part.id 
                            
                            div.style.cursor = "pointer" 
                            div.style.transition = "background-color 0.3s" 

                            div.onmouseover = () => {
                                div.style.backgroundColor = "#f0f0f0" 
                            }
                            div.onmouseout = () => {
                                div.style.backgroundColor = "" 
                            }
                           
                            div.onclick = () => {
                                this.handleItemClick(part.id) 
                            }

                            dataBox.appendChild(div)
                        })
                    }
                    break
                case 'profile':
                    await this.loadProfileData()
                    if (this.profileData) {
                        console.log("data", this.profileData)
                        this.profileData.data.forEach(profile => {
                            const div = document.createElement("div")
                            div.style.padding = "5px"
                            div.style.borderBottom = "1px solid #eee"
                            div.textContent = profile.name.en
                            div.value = profile.id 
                            
                            div.style.cursor = "pointer" 
                            div.style.transition = "background-color 0.3s" 

                            div.onmouseover = () => {
                                div.style.backgroundColor = "#f0f0f0" 
                            }
                            div.onmouseout = () => {
                                div.style.backgroundColor = "" 
                            }
                           
                            div.onclick = () => {
                                this.handleItemClick(profile.id) 
                            }

                            dataBox.appendChild(div)
                        })
                    }
                    break
                case 'item master':
                    // Add item master data when available
                    dataBox.innerHTML = '<div>Item master data will be displayed here</div>'
                    break
            }
        }

        this.typeSelect = typeSelect
        dataBoxContainer.appendChild(dataBox)

        this.detailsContainer.appendChild(typeLabel)
        this.detailsContainer.appendChild(typeSelect)
        this.detailsContainer.appendChild(dataBoxContainer)

        // Title
        const title = document.createElement("h2");
        title.innerText = "Material Properties";
        this.detailsContainer.appendChild(title);

        this.detailsContainer.appendChild(this.createPositionInput("X Position", "x"));
        this.detailsContainer.appendChild(this.createPositionInput("Y Position", "y"));

        // Save Button
        const saveButton = document.createElement("button");
        saveButton.innerText = "Save";
        saveButton.style.marginTop = "20px";
        saveButton.style.padding = "10px";
        saveButton.style.background = "#004080";
        saveButton.style.color = "white";
        saveButton.style.border = "none";
        saveButton.style.cursor = "pointer";
        saveButton.onclick = () => this.saveChanges();
        this.detailsContainer.appendChild(saveButton);

        const cancelButton = document.createElement("button");
        cancelButton.innerText = "Cancel";
        cancelButton.style.marginTop = "20px";
        cancelButton.style.padding = "10px";
        cancelButton.style.background = "#004080";
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
        this.miniViewer = new MiniViewer(this.selectedRectangle, this.viewer, this.popupContainer);
    }

    createPositionInput(labelText, axis) {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "10px";

        const label = document.createElement("label");
        label.innerText = labelText;
        label.style.marginRight = "10px";

        const input = document.createElement("input");
        input.type = "number";
        input.value = Math.round(this.selectedRectangle?.parent?.position[axis]) || 0;
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

    async loadArticleData() {
        try {
            const response = await fetch('http://localhost:3030/api/articles')
            if (!response.ok) {
                throw new Error('Failed to fetch article data')
            }
            this.articleData = await response.json()
        } catch (error) {
            console.error('Error loading article data:', error)
        }
    }

    async loadPartData() {
        try {
            const response = await fetch('http://localhost:3030/api/parts')
            if (!response.ok) {
                throw new Error('Failed to fetch part data')
            }
            this.partData = await response.json()
        } catch (error) {
            console.error('Error loading part data:', error)
        }
    }

    async loadProfileData() {
        try {
            const response = await fetch('http://localhost:3030/api/profiles')
            if (!response.ok) {
                throw new Error('Failed to fetch profile data')
            }
            this.profileData = await response.json()
        } catch (error) {
            console.error('Error loading profile data:', error)
        }
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

    createDimensionBox() {
        // Check if the dimension box already exists
        let dimensionBox = document.getElementById("dimension-box");
        if (!dimensionBox) {
            dimensionBox = document.createElement("div");
            dimensionBox.id = "dimension-box";
            document.body.appendChild(dimensionBox);
        }
    }

 
    handleItemClick(itemId) {
        console.log("Selected Item ID:", itemId)
    }
}

export { Popup };
